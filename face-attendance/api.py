import cv2
import numpy as np
import face_recognition
import os
from fastapi import FastAPI, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
from datetime import datetime
from utils import find_encodings, load_student_images, mark_attendance
from contextlib import asynccontextmanager
import threading

# Global variables
known_encodings = []
known_names = []
current_frame = None
lock = threading.Lock()

def load_data():
    global known_encodings, known_names
    images, names = load_student_images('student_images')
    known_encodings = find_encodings(images)
    known_names = names
    print(f"Loaded {len(known_names)} students.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_data()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global video capture to prevent multiple initializations
cap = None

def get_cap():
    global cap
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)
    return cap

def gen_frames():
    global current_frame
    camera = get_cap()
    
    while True:
        with lock:
            success, frame = camera.read()
        if not success:
            print("Failed to read from camera")
            break
            
        current_frame = frame.copy()
        
        # Performance optimization: only recognize every few frames or on smaller scale
        img_small = cv2.resize(frame, (0, 0), None, 0.25, 0.25)
        img_small = cv2.cvtColor(img_small, cv2.COLOR_BGR2RGB)
        
        faces_cur_frame = face_recognition.face_locations(img_small)
        encodes_cur_frame = face_recognition.face_encodings(img_small, faces_cur_frame)

        for encode_face, face_loc in zip(encodes_cur_frame, faces_cur_frame):
            matches = face_recognition.compare_faces(known_encodings, encode_face)
            face_dis = face_recognition.face_distance(known_encodings, encode_face)
            
            if len(face_dis) > 0:
                match_index = np.argmin(face_dis)
                if matches[match_index] and face_dis[match_index] < 0.50:
                    name = known_names[match_index].upper()
                    mark_attendance(name)
                    
                    y1, x2, y2, x1 = face_loc
                    y1, x2, y2, x1 = y1 * 4, x2 * 4, y2 * 4, x1 * 4
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_COMPLEX, 0.8, (255, 255, 255), 2)

        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/attendance")
async def get_attendance():
    filename = 'attendance.csv'
    if os.path.exists(filename):
        return pd.read_csv(filename).to_dict(orient='records')
    return []

@app.post("/register_capture")
async def register_capture(name: str):
    global current_frame
    if current_frame is None:
        return {"status": "error", "message": "Camera not ready."}
    
    path = 'student_images'
    os.makedirs(path, exist_ok=True)
    cv2.imwrite(os.path.join(path, f"{name.replace(' ', '_')}.jpg"), current_frame)
    load_data()
    return {"status": "success", "message": f"Student {name} registered!"}

@app.get("/stats")
async def get_stats():
    filename = 'attendance.csv'
    if os.path.exists(filename) and os.path.getsize(filename) > 0:
        try:
            df = pd.read_csv(filename)
            return {
                "total_logs": len(df),
                "unique_students": df['Name'].nunique(),
                "last_entry": df.iloc[-1]['Name'] if not df.empty else "None"
            }
        except Exception:
            pass
    return {"total_logs": 0, "unique_students": 0, "last_entry": "None"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
