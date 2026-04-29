# 🚀 Automated Face Recognition Attendance System

A premium, real-time attendance tracking system using **Python**, **OpenCV**, **FastAPI**, and **Next.js**.

---

## ✨ Features
- **Real-time Recognition**: Detects and identifies students via webcam.
- **Next.js Dashboard**: Stunning dark-mode dashboard with live stream and stats.
- **Web-Based Registration**: Register new students directly from the dashboard!
- **Smart Logging**: Prevents duplicate attendance marks for the same day.
- **Optimized for macOS**: Custom memory handling and bypass for AVFoundation.

---

## 🛠️ Project Structure
- `/face-attendance`: Python backend logic and API.
- `/face-attendance/frontend`: Next.js React dashboard.
- `/student_images`: Storage for student reference photos.
- `attendance.csv`: The generated attendance report.

---

## 🏃‍♂️ How to Run

### 1. Start the Backend (Terminal 1)
```bash
cd face-attendance
source venv/bin/activate

# Critical fix for macOS camera permissions
export OPENCV_AVFOUNDATION_SKIP_AUTH=1

# Run the API
python3 api.py
```
*API will run at `http://localhost:8000`*

### 2. Start the Frontend (Terminal 2)
```bash
cd face-attendance/frontend
npm run dev
```
*Dashboard will run at `http://localhost:3000`*

---

## 📸 Registration Guide
1. Open the dashboard in your browser.
2. Click the **"Register Student"** button.
3. Enter the student's name.
4. Position yourself in the live feed and click **"Begin Capture"**.
5. The system will instantly reload and start recognizing the new student!

---

## ⚠️ Troubleshooting (macOS)
- **Permission Error**: If you see `not authorized to capture video`, go to *System Settings > Privacy > Camera* and ensure your terminal app is checked.
- **Port in Use**: If port 8000 is busy, run: `lsof -ti:8000 | xargs kill -9`.
- **Malloc Error**: Ensure you have run `export OPENCV_AVFOUNDATION_SKIP_AUTH=1` in your terminal session.

---

## 🛠️ Tech Stack
- **Backend**: Python 3.14, FastAPI, OpenCV, dlib (face_recognition), Pandas.
- **Frontend**: Next.js 16, Tailwind CSS v4, Framer Motion, Lucide Icons.
