# Face Recognition Attendance System

Automated attendance marking using your laptop webcam.

---

## Quick Start (3 steps)

### Step 1 — Install dependencies
```bash
pip install face_recognition opencv-python pandas numpy
```
> **Note for Windows users:** `face_recognition` requires `dlib`.  
> Run: `pip install cmake dlib face_recognition`

---

### Step 2 — Register students
```bash
python register_student.py
```
- Enter the student's name
- Press **SPACE** to take 3–5 photos (more = better accuracy)
- Press **Q** when done
- Repeat for each student

> **OR** manually copy existing photos into the `student_images/` folder.  
> Name each file: `FirstName_LastName.jpg`

---

### Step 3 — Run the system
```bash
python attendance_system.py
```
- The webcam opens and starts recognizing faces in real time
- A green box = recognized student (marked Present)
- A red box = Unknown face
- Press **Q** to quit — `attendance.csv` is saved automatically

---

## View Reports
```bash
python view_report.py
```
Prints a formatted attendance summary from `attendance.csv`.

---

## File Structure
```
attendance_system/
├── attendance_system.py    ← Main program
├── register_student.py     ← Register new students
├── view_report.py          ← View attendance report
├── requirements.txt
├── attendance.csv          ← Auto-generated after first run
└── student_images/         ← Put student photos here
    ├── Alice.jpg
    ├── Bob_Smith.jpg
    └── ...
```

---

## Configuration (inside `attendance_system.py`)

| Variable | Default | Description |
|---|---|---|
| `TOLERANCE` | `0.50` | Match strictness. Lower = stricter (try 0.4–0.6) |
| `FRAME_SCALE` | `0.25` | Frame resize for speed. Lower = faster |
| `COOLDOWN_SECONDS` | `10` | Seconds before re-marking same student |

---

## Evaluation Metrics (printed after each session)
- **Accuracy** — % of correct identifications
- **False Acceptance Rate (FAR)** — Unknown faces wrongly accepted
- **Avg Processing Latency** — ms per frame

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `dlib` install fails | Install CMake first: `pip install cmake` |
| Webcam not opening | Change `cv2.VideoCapture(0)` to `(1)` |
| Low accuracy | Add more photos per student, adjust `TOLERANCE` |
| No face detected in photo | Use a well-lit, front-facing photo |
