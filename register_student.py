"""
============================================================
  STUDENT REGISTRATION TOOL
  Captures webcam photos and saves them to student_images/
============================================================
  HOW TO USE:
  1. Run:  python register_student.py
  2. Enter the student's name when prompted
  3. Press SPACE to capture a photo (take 3–5 for best results)
  4. Press Q when done
============================================================
"""

import cv2
import os
import time

STUDENT_IMAGES_DIR = "student_images"
os.makedirs(STUDENT_IMAGES_DIR, exist_ok=True)


def register_student():
    name = input("Enter student name (e.g. John Doe): ").strip()
    if not name:
        print("[ERROR] Name cannot be empty.")
        return

    safe_name = name.replace(" ", "_")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[ERROR] Cannot open webcam.")
        return

    print(f"\n[INFO] Registering: {name}")
    print("  Press SPACE to capture a photo")
    print("  Press Q to finish\n")

    count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Overlay instructions
        cv2.putText(frame, f"Registering: {name}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 50), 2)
        cv2.putText(frame, f"Photos taken: {count}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        cv2.putText(frame, "SPACE = capture | Q = done", (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        cv2.imshow("Student Registration", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(" "):
            # Save photo
            filename = f"{safe_name}_{count + 1}.jpg" if count > 0 else f"{safe_name}.jpg"
            filepath = os.path.join(STUDENT_IMAGES_DIR, filename)
            cv2.imwrite(filepath, frame)
            count += 1
            print(f"  ✓ Saved photo {count}: {filepath}")
            time.sleep(0.3)  # small delay to avoid duplicate captures

        elif key == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"\n[DONE] {count} photo(s) saved for '{name}'")
    print(f"       You can now run attendance_system.py\n")


if __name__ == "__main__":
    register_student()
