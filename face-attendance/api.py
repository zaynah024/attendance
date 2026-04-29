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

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for caching encodings
known_encodings = []
known_names = []

def load_data():
    global known_encodings, known_names
    images, names = load_student_images('student_images')
    known_encodings = find_encodings(images)
    known_names = names
    print(f"Loaded {len(known_names)} students.")

@app.on_event("startup")
async def startup_event():
    load_data()

def gen_frames():
    cap = cv2.VideoCapture(0)
    while True:
        success, frame = cap.read()
        if not success:
            break
        else:
            # Face recognition logic
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
                        cv2.putText(frame, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)

            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/attendance")
async def get_attendance():
    filename = 'attendance.csv'
    if os.path.exists(filename):
        df = pd.read_csv(filename)
        return df.to_dict(orient='records')
    return []

@app.post("/register")
async def register_student_api(name: str, file: UploadFile = File(...)):
    path = 'student_images'
    if not os.path.exists(path):
        os.makedirs(path)
    
    file_path = os.path.join(path, f"{name.replace(' ', '_')}.jpg")
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Reload encodings
    load_data()
    return {"status": "success", "message": f"Student {name} registered."}

@app.get("/stats")
async def get_stats():
    filename = 'attendance.csv'
    if os.path.exists(filename):
        df = pd.read_csv(filename)
        total = len(df)
        unique_students = df['Name'].nunique()
        return {
            "total_logs": total,
            "unique_students": unique_students,
            "last_entry": df.iloc[-1]['Name'] if total > 0 else "None"
        }
    return {"total_logs": 0, "unique_students": 0, "last_entry": "None"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
