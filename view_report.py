"""
============================================================
  ATTENDANCE REPORT VIEWER
  Reads attendance.csv and prints a formatted summary
============================================================
  HOW TO USE:
  Run:  python view_report.py
============================================================
"""

import pandas as pd
import os
from datetime import datetime

ATTENDANCE_FILE = "attendance.csv"


def view_report():
    if not os.path.exists(ATTENDANCE_FILE):
        print(f"[ERROR] '{ATTENDANCE_FILE}' not found. Run the attendance system first.")
        return

    df = pd.read_csv(ATTENDANCE_FILE)

    print("\n" + "=" * 60)
    print("  ATTENDANCE REPORT")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    for date, group in df.groupby("Date"):
        present = group[group["Status"] == "Present"]
        absent  = group[group["Status"] == "Absent"]
        total   = len(group)
        pct     = len(present) / total * 100 if total else 0

        print(f"\n  📅 Date: {date}  |  Attendance: {len(present)}/{total} ({pct:.1f}%)")
        print("  " + "-" * 55)
        print(f"  {'NAME':<25} {'STATUS':<10} {'TIME'}")
        print("  " + "-" * 55)

        for _, row in group.sort_values("Status", ascending=False).iterrows():
            status_icon = "✓" if row["Status"] == "Present" else "✗"
            time_str    = row["Time"] if row["Status"] == "Present" else "—"
            print(f"  {status_icon}  {row['Name']:<23} {row['Status']:<10} {time_str}")

    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    view_report()
