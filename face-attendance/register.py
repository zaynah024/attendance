import cv2
import os

def register_student():
    name = input("Enter Student Name: ").strip().replace(" ", "_")
    if not name:
        print("Invalid name.")
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print(f"Capturing photo for {name}. Press 's' to save or 'q' to cancel.")
    
    while True:
        success, img = cap.read()
        if not success:
            break
            
        cv2.imshow('Register Student', img)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('s'):
            path = 'student_images'
            if not os.path.exists(path):
                os.makedirs(path)
            
            img_path = os.path.join(path, f"{name}.jpg")
            cv2.imwrite(img_path, img)
            print(f"Saved: {img_path}")
            break
        elif key == ord('q'):
            print("Cancelled.")
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    register_student()
