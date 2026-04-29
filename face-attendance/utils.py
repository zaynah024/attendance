import face_recognition
import cv2
import numpy as np
import os
from datetime import datetime
import pandas as pd

def find_encodings(images):
    """
    Find 128-dimension face encodings for a list of images.
    """
    encode_list = []
    for img in images:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        try:
            encode = face_recognition.face_encodings(img)[0]
            encode_list.append(encode)
        except IndexError:
            print("Warning: A face was not detected in one of the reference images.")
    return encode_list

def mark_attendance(name):
    """
    Logs attendance to attendance.csv. 
    Prevents duplicate entries within the same minute.
    """
    filename = 'attendance.csv'
    now = datetime.now()
    dt_string = now.strftime('%Y-%m-%d %H:%M:%S')
    
    # Create file with headers if it doesn't exist
    if not os.path.exists(filename):
        df = pd.DataFrame(columns=['Name', 'Time'])
        df.to_csv(filename, index=False)
    
    # Read existing data
    df = pd.read_csv(filename)
    
    # Check if student already marked in the last hour (or day)
    # For simplicity, we'll just check if they are in the file today
    today = now.strftime('%Y-%m-%d')
    already_marked = False
    
    if not df.empty:
        # Check if name exists for today
        today_attendance = df[df['Time'].str.contains(today)]
        if name in today_attendance['Name'].values:
            already_marked = True
            
    if not already_marked:
        new_row = {'Name': name, 'Time': dt_string}
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df.to_csv(filename, index=False)
        print(f"Attendance marked for: {name}")
        return True
    return False

def load_student_images(path='student_images'):
    """
    Loads images from the student_images folder and returns images and names.
    """
    images = []
    class_names = []
    my_list = os.listdir(path)
    print(f"Found {len(my_list)} files in {path}")
    
    for cl in my_list:
        if cl.endswith(('.jpg', '.jpeg', '.png')):
            cur_img = cv2.imread(f'{path}/{cl}')
            images.append(cur_img)
            class_names.append(os.path.splitext(cl)[0])
    
    return images, class_names
