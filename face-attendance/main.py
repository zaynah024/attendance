import cv2
import numpy as np
import face_recognition
import os
from utils import find_encodings, mark_attendance, load_student_images

def main():
    # 1. Load and Encode Student Images
    print("Initializing System... Loading student data...")
    path = 'student_images'
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Directory '{path}' created. Please add student photos there.")
        return

    images, class_names = load_student_images(path)
    if not images:
        print("No student images found in 'student_images/'. Please add some images and restart.")
        return

    print(f"Encoding {len(images)} faces... Please wait.")
    encode_list_known = find_encodings(images)
    print("Encoding Complete.")

    # 2. Initialize Webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("Webcam started. Press 'q' to exit.")

    while True:
        success, img = cap.read()
        if not success:
            print("Failed to capture image.")
            break

        # Resize for faster processing
        img_small = cv2.resize(img, (0, 0), None, 0.25, 0.25)
        img_small = cv2.cvtColor(img_small, cv2.COLOR_BGR2RGB)

        # Find faces in current frame
        faces_cur_frame = face_recognition.face_locations(img_small)
        encodes_cur_frame = face_recognition.face_encodings(img_small, faces_cur_frame)

        for encode_face, face_loc in zip(encodes_cur_frame, faces_cur_frame):
            matches = face_recognition.compare_faces(encode_list_known, encode_face)
            face_dis = face_recognition.face_distance(encode_list_known, encode_face)
            
            match_index = np.argmin(face_dis)

            if matches[match_index]:
                name = class_names[match_index].upper()
                # Use a threshold to ensure high confidence
                if face_dis[match_index] < 0.50:
                    mark_attendance(name)
                    
                    # Draw box and name
                    y1, x2, y2, x1 = face_loc
                    y1, x2, y2, x1 = y1 * 4, x2 * 4, y2 * 4, x1 * 4
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.rectangle(img, (x1, y2 - 35), (x2, y2), (0, 255, 0), cv2.FILLED)
                    cv2.putText(img, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)
                else:
                    name = "UNKNOWN"
                    y1, x2, y2, x1 = face_loc
                    y1, x2, y2, x1 = y1 * 4, x2 * 4, y2 * 4, x1 * 4
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(img, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)

        cv2.imshow('Webcam Attendance System', img)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
