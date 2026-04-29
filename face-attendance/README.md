# Automated Face Recognition Attendance System

This system uses a webcam to automatically detect and recognize students, logging their attendance in a CSV file.

## Features
- **Real-time Face Detection**: Uses HOG/CNN via `face_recognition`.
- **128-D Face Encodings**: High-accuracy facial feature extraction.
- **Automated Logging**: Saves Name and Timestamp to `attendance.csv`.
- **Duplicate Prevention**: Only marks attendance once per student per day.
- **Student Registration**: Easy script to add new student photos.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   # Create a virtual environment (already done in this workspace)
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Register Students**:
   Run the registration script to take a photo of yourself or a student:
   ```bash
   python3 register.py
   ```
   - Enter the student's name.
   - Look at the camera and press **'s'** to save the photo.
   - The photo will be saved in `student_images/`.

3. **Run Attendance System**:
   ```bash
   python3 main.py
   ```
   - The system will load the encoded faces.
   - It will open a webcam window.
   - When it recognizes a face, it will draw a green box and log the attendance.
   - Press **'q'** to quit.

## Files
- `main.py`: The core application.
- `utils.py`: Helper functions for encoding and logging.
- `register.py`: Utility to capture new student photos.
- `attendance.csv`: Generated log file.
- `student_images/`: Folder containing reference photos.

## Technical Details
- **Backend**: Python 3.x
- **Computer Vision**: OpenCV & face_recognition (dlib)
- **Data Management**: Pandas
