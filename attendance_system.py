"""
============================================================
  FACE RECOGNITION ATTENDANCE SYSTEM
  Easy-to-run version using face_recognition + OpenCV
============================================================
  HOW TO USE:
  1. Install deps:  pip install face_recognition opencv-python pandas numpy
  2. Add student photos to the 'student_images/' folder
     (name each file:  StudentName.jpg  or  John_Doe.jpg)
  3. Run:  python attendance_system.py
  4. Press 'Q' to quit — attendance.csv is auto-saved
============================================================
"""

import cv2
import face_recognition
import numpy as np
import pandas as pd
import os
import time
from datetime import datetime


# ─────────────────────────────────────────────
#  CONFIG  (change these if needed)
# ─────────────────────────────────────────────
STUDENT_IMAGES_DIR = "student_images"   # folder with student photos
ATTENDANCE_FILE    = "attendance.csv"   # output CSV
TOLERANCE          = 0.50               # lower = stricter (0.4–0.6 works best)
FRAME_SCALE        = 0.25              # shrink frame for speed (0.25 = 25%)
COOLDOWN_SECONDS   = 10                # min seconds before re-marking same student
# ─────────────────────────────────────────────


def load_student_encodings(images_dir: str):
    """Load all student images and compute face encodings."""
    known_encodings = []
    known_names    = []

    if not os.path.exists(images_dir):
        print(f"[ERROR] Folder '{images_dir}' not found.")
        print("  → Create the folder and add student photos named: StudentName.jpg")
        return known_encodings, known_names

    image_files = [
        f for f in os.listdir(images_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    if not image_files:
        print(f"[WARNING] No images found in '{images_dir}'")
        print("  → Add photos like: John_Doe.jpg, Alice.jpg, etc.")
        return known_encodings, known_names

    print(f"\n[INFO] Loading {len(image_files)} student image(s)...")
    for filename in image_files:
        path = os.path.join(images_dir, filename)
        name = os.path.splitext(filename)[0].replace("_", " ")

        img = face_recognition.load_image_file(path)
        encodings = face_recognition.face_encodings(img)

        if encodings:
            known_encodings.append(encodings[0])
            known_names.append(name)
            print(f"  ✓ Loaded: {name}")
        else:
            print(f"  ✗ No face found in: {filename} (skipping)")

    print(f"[INFO] {len(known_names)} student(s) loaded.\n")
    return known_encodings, known_names


def init_attendance(names: list) -> pd.DataFrame:
    """Create a fresh attendance DataFrame for this session."""
    now = datetime.now().strftime("%Y-%m-%d")
    df  = pd.DataFrame({"Name": names, "Date": now, "Time": "Absent", "Status": "Absent"})
    return df


def mark_attendance(df: pd.DataFrame, name: str, last_marked: dict) -> bool:
    """Mark a student present if cooldown has passed. Returns True if newly marked."""
    now      = time.time()
    cooldown = last_marked.get(name, 0)

    if now - cooldown < COOLDOWN_SECONDS:
        return False  # still in cooldown

    last_marked[name] = now
    timestamp = datetime.now().strftime("%H:%M:%S")

    if name in df["Name"].values:
        df.loc[df["Name"] == name, ["Time", "Status"]] = [timestamp, "Present"]
    else:
        # Student not pre-registered — add them anyway
        new_row = pd.DataFrame([{
            "Name": name,
            "Date": datetime.now().strftime("%Y-%m-%d"),
            "Time": timestamp,
            "Status": "Present"
        }])
        df = pd.concat([df, new_row], ignore_index=True)

    return True


def draw_ui(frame, name, confidence, color):
    """Draw bounding box + name label on frame."""
    pass  # boxes are drawn inline below; kept for extensibility


def save_attendance(df: pd.DataFrame, filepath: str):
    """Save DataFrame to CSV, appending if file exists."""
    if os.path.exists(filepath):
        existing = pd.read_csv(filepath)
        combined = pd.concat([existing, df], ignore_index=True).drop_duplicates(
            subset=["Name", "Date"], keep="last"
        )
        combined.to_csv(filepath, index=False)
    else:
        df.to_csv(filepath, index=False)
    print(f"\n[SAVED] Attendance written to '{filepath}'")


def run_attendance_system():
    # ── 1. Load students
    known_encodings, known_names = load_student_encodings(STUDENT_IMAGES_DIR)

    # ── 2. Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Cannot open webcam. Make sure it's connected.")
        return

    # ── 3. Init attendance sheet
    df          = init_attendance(known_names)
    last_marked = {}   # {name: timestamp} cooldown tracker

    # ── Metrics
    total_attempts   = 0
    correct_matches  = 0
    false_acceptances= 0
    latencies        = []

    print("=" * 50)
    print("  Attendance System Running")
    print("  Press  Q  to quit and save attendance")
    print("=" * 50)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Failed to grab frame.")
            break

        # ── 4. Resize for speed
        small_frame = cv2.resize(frame, (0, 0), fx=FRAME_SCALE, fy=FRAME_SCALE)
        rgb_small   = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # ── 5. Detect & encode faces
        t_start      = time.time()
        face_locs    = face_recognition.face_locations(rgb_small, model="hog")
        face_encs    = face_recognition.face_encodings(rgb_small, face_locs)
        latency      = time.time() - t_start
        latencies.append(latency)

        # ── 6. Scale locations back to original frame
        scale = int(1 / FRAME_SCALE)

        for face_enc, face_loc in zip(face_encs, face_locs):
            total_attempts += 1

            # Compare with known students
            matches   = face_recognition.compare_faces(known_encodings, face_enc, tolerance=TOLERANCE)
            distances = face_recognition.face_distance(known_encodings, face_enc)

            name       = "Unknown"
            confidence = 0.0
            color      = (0, 0, 255)   # Red for unknown

            if known_encodings and distances.size > 0:
                best_idx = np.argmin(distances)
                if matches[best_idx]:
                    name       = known_names[best_idx]
                    confidence = (1 - distances[best_idx]) * 100
                    color      = (0, 200, 50)   # Green for known
                    newly_marked = mark_attendance(df, name, last_marked)
                    if newly_marked:
                        correct_matches += 1
                        print(f"  ✓ MARKED: {name}  ({confidence:.1f}%)")
                else:
                    false_acceptances += 1

            # ── 7. Draw bounding box
            top, right, bottom, left = [v * scale for v in face_loc]
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

            # Label background
            label   = f"{name}  {confidence:.0f}%" if name != "Unknown" else "Unknown"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
            cv2.rectangle(frame, (left, bottom - th - 12), (left + tw + 8, bottom), color, -1)
            cv2.putText(frame, label, (left + 4, bottom - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # ── 8. Overlay stats HUD
        present_count = len(df[df["Status"] == "Present"])
        total_count   = len(df)
        avg_latency   = np.mean(latencies[-30:]) * 1000 if latencies else 0

        hud_lines = [
            f"Present: {present_count}/{total_count}",
            f"Latency: {avg_latency:.0f} ms",
            f"Faces detected: {len(face_locs)}",
            "Press Q to quit",
        ]
        for i, line in enumerate(hud_lines):
            cv2.putText(frame, line, (10, 25 + i * 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

        cv2.imshow("Face Recognition Attendance System", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # ── 9. Cleanup & Save
    cap.release()
    cv2.destroyAllWindows()
    save_attendance(df, ATTENDANCE_FILE)

    # ── 10. Print session metrics
    print("\n" + "=" * 50)
    print("  SESSION METRICS")
    print("=" * 50)
    print(f"  Total face detections : {total_attempts}")
    print(f"  Correct identifications: {correct_matches}")
    accuracy = (correct_matches / total_attempts * 100) if total_attempts else 0
    far      = (false_acceptances / total_attempts * 100) if total_attempts else 0
    avg_lat  = np.mean(latencies) * 1000 if latencies else 0
    print(f"  Accuracy              : {accuracy:.1f}%")
    print(f"  False Acceptance Rate : {far:.1f}%")
    print(f"  Avg Processing Latency: {avg_lat:.1f} ms")
    print("=" * 50)

    print("\n  Final Attendance:")
    print(df.to_string(index=False))


# ── Entry point
if __name__ == "__main__":
    run_attendance_system()
