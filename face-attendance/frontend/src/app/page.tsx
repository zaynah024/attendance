"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera, Users, CheckCircle2, XCircle, Clock, UserPlus,
  RefreshCw, Download, ShieldCheck, Wifi, AlertCircle,
  BookOpen, TrendingUp, X, Scan
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AttendanceLog {
  Name: string;
  Time: string;
}

interface Stats {
  total_logs: number;
  unique_students: number;
  last_entry: string;
}

interface StudentRow {
  name: string;
  status: "present" | "absent";
  checkInTime: string | null;
}

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function getAvatarColor(name: string) {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function AttendanceDashboard() {
  const [students, setStudents] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total_logs: 0, unique_students: 0, last_entry: "None" });
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState("");
  const [regStatus, setRegStatus] = useState({ message: "", type: "" });
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastName, setToastName] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "present" | "absent">("all");
  const lastSeenRef = useRef<string | null>(null);

  // Clock — only runs client-side, avoids SSR hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [studRes, attRes, statsRes] = await Promise.all([
        fetch("http://localhost:8000/students"),
        fetch("http://localhost:8000/attendance"),
        fetch("http://localhost:8000/stats"),
      ]);
      const studData: string[] = await studRes.json();
      const attData: AttendanceLog[] = await attRes.json();
      const statsData: Stats = await statsRes.json();

      setStudents(studData);
      setAttendance(attData);
      setStats(statsData);
      setBackendOnline(true);

      // Toast for newly recognised student (use ref to avoid re-render loop)
      if (attData.length > 0) {
        const latest = attData[attData.length - 1];
        if (latest.Name !== lastSeenRef.current) {
          lastSeenRef.current = latest.Name;
          setLastSeen(latest.Name);
          setToastName(latest.Name);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
        }
      }
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 4000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Build roster: merge students list with attendance
  const todayStr = new Date().toDateString();
  const presentToday = new Set<string>();
  const checkInMap = new Map<string, string>();

  attendance.forEach((log) => {
    if (new Date(log.Time).toDateString() === todayStr) {
      presentToday.add(log.Name.toUpperCase());
      if (!checkInMap.has(log.Name.toUpperCase())) {
        checkInMap.set(log.Name.toUpperCase(), log.Time);
      }
    }
  });

  const roster: StudentRow[] = students.map((s) => {
    const key = s.toUpperCase();
    const isPresent = presentToday.has(key);
    return {
      name: s,
      status: isPresent ? "present" : "absent",
      checkInTime: isPresent ? checkInMap.get(key) ?? null : null,
    };
  });

  // Roster strictly reflects student_images/ — deleted students are excluded.

  const totalStudents = roster.length;
  const presentCount = roster.filter((r) => r.status === "present").length;
  const absentCount = totalStudents - presentCount;
  const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const filteredRoster = roster.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchFilter;
  });

  // Sort: present first, then absent; within each group alphabetically
  filteredRoster.sort((a, b) => {
    if (a.status !== b.status) return a.status === "present" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setRegStatus({ message: "Enter a name first.", type: "error" }); return; }
    setRegStatus({ message: "Capturing face…", type: "info" });
    try {
      const res = await fetch(`http://localhost:8000/register_capture?name=${encodeURIComponent(newName.trim())}`, { method: "POST" });
      const data = await res.json();
      setRegStatus({ message: data.message, type: data.status === "success" ? "success" : "error" });
      if (data.status === "success") {
        setNewName("");
        setTimeout(() => { setIsRegistering(false); fetchAll(); }, 2000);
      }
    } catch {
      setRegStatus({ message: "Backend connection failed.", type: "error" });
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await fetch(`http://localhost:8000/students/${encodeURIComponent(name)}`, { method: "DELETE" });
      fetchAll();
    } catch (err) {
      console.error("Failed to delete student");
    }
  };

  const handleReload = async () => {
    try {
      setBackendOnline(false); // Visual feedback
      const res = await fetch(`http://localhost:8000/reload`, { method: "POST" });
      if (res.ok) {
        await fetchAll();
        setBackendOnline(true);
        alert("System synchronized successfully!");
      } else {
        throw new Error("Failed to reload");
      }
    } catch (err) {
      console.error("Failed to reload system", err);
      alert("Error: Could not reach backend. Is the server running?");
    }
  };

  const handleResetCamera = async () => {
    try {
      await fetch(`http://localhost:8000/reset_camera`, { method: "POST" });
      alert("Camera reset signal sent.");
    } catch (err) {
      console.error("Failed to reset camera");
    }
  };

  const exportCSV = () => {
    const rows = ["Name,Status,Check-In Time", ...roster.map((r) => `${r.name},${r.status},${r.checkInTime ? formatTime(r.checkInTime) : "-"}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans">
      {/* ── Gradient BG ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl" />
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl rounded-2xl shadow-xl"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Attendance Marked</p>
              <p className="text-sm font-bold text-white">{toastName}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* ══════════════════════════════════
            LEFT SIDEBAR — Camera + Session
        ══════════════════════════════════ */}
        <aside className="w-72 flex-shrink-0 border-r border-white/5 bg-white/[0.02] flex flex-col p-4 gap-4">
          {/* Brand */}
          <div className="px-2 pt-2">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Scan size={14} />
              </div>
              <h1 className="text-base font-bold">FaceAttend</h1>
            </div>
            <p className="text-[11px] text-gray-500">Biometric Attendance System</p>
          </div>

          {/* Connection badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${backendOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            <Wifi size={12} />
            {backendOnline ? "Camera System Online" : "Backend Offline"}
          </div>

          {/* Live feed */}
          <div className="rounded-2xl overflow-hidden border border-white/10 relative bg-black flex-shrink-0">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
              LIVE
            </div>
            <img
              src="http://localhost:8000/video_feed"
              alt="Live Feed"
              className="w-full aspect-video object-cover"
              onError={(e) => { e.currentTarget.style.opacity = "0.1"; }}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 flex justify-between items-end">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <ShieldCheck size={11} className="text-emerald-400" />
                Scanning for faces…
              </div>
              <button 
                onClick={handleResetCamera}
                className="p-1 rounded bg-black/40 hover:bg-black/60 text-[9px] font-bold text-gray-400 hover:text-white transition-all border border-white/10"
              >
                Reset Camera
              </button>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
              <BookOpen size={12} />
              Today's Session
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm font-semibold text-white leading-tight">{now ? formatDate(now) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Time</p>
              <p className="text-2xl font-bold tabular-nums text-blue-400">
                {now ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:-- --"}
              </p>
            </div>
          </div>

          {/* Last Recognised */}
          {lastSeen && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-2">Last Recognised</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(lastSeen)} flex items-center justify-center text-sm font-bold`}>
                  {lastSeen[0]}
                </div>
                <div>
                  <p className="text-sm font-bold">{lastSeen}</p>
                  <p className="text-[10px] text-gray-400">Marked Present</p>
                </div>
              </div>
            </div>
          )}

          {/* Spacer + Register btn */}
          <div className="mt-auto">
            <button
              onClick={() => { setIsRegistering(true); setRegStatus({ message: "", type: "" }); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl transition-all text-sm font-semibold"
            >
              <UserPlus size={16} />
              Register New Student
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════
            MAIN CONTENT — Roster
        ══════════════════════════════════ */}
        <main className="flex-1 overflow-y-auto">
          {/* Top bar */}
          <div className="sticky top-0 z-20 bg-[#070b14]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Attendance Register</h2>
                <p className="text-xs text-gray-500 mt-0.5">{now ? formatDate(now) : "—"} · Auto-updating every 4s</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleReload} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-xs font-bold shadow-lg shadow-blue-500/20"
                  title="Reload backend encodings and refresh roster"
                >
                  <RefreshCw size={14} className={!backendOnline ? "animate-spin" : ""} />
                  Sync & Reload System
                </button>
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium text-gray-300 border border-white/10">
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Students", value: totalStudents, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: "Present", value: presentCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { label: "Absent", value: absentCount, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                { label: "Attendance Rate", value: `${attendancePct}%`, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${s.bg} border rounded-2xl p-4 flex items-center gap-4`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${s.color}`}>
                    <s.icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Attendance progress bar */}
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Attendance Progress</span>
                <span className="font-semibold text-white">{presentCount} / {totalStudents} students present</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attendancePct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${attendancePct >= 75 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : attendancePct >= 50 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`}
                />
              </div>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search student…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600"
                />
              </div>
              {(["all", "present", "absent"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${filterStatus === f ? "bg-blue-600 text-white" : "bg-white/[0.04] border border-white/10 text-gray-400 hover:bg-white/10"}`}
                >
                  {f === "all" ? "All" : f === "present" ? `✓ Present (${presentCount})` : `✗ Absent (${absentCount})`}
                </button>
              ))}
            </div>

            {/* Roster table */}
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-white/[0.03] border-b border-white/5 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Student</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2">Check-In Time</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                <AnimatePresence>
                  {filteredRoster.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <AlertCircle size={36} className="mb-3 opacity-30" />
                      <p className="text-sm">No students match your filters</p>
                    </div>
                  )}
                  {filteredRoster.map((row, i) => (
                    <motion.div
                      key={row.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors group ${row.status === "present" ? "bg-emerald-500/[0.015]" : ""}`}
                    >
                      {/* # */}
                      <div className="col-span-1 text-sm text-gray-600 tabular-nums">{i + 1}</div>

                      {/* Student */}
                      <div className="col-span-5 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(row.name)} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                          {row.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold capitalize">{row.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                          <p className="text-[11px] text-gray-500">{row.status === "present" ? "Face recognised" : "Not detected yet"}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-3">
                        {row.status === "present" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 size={11} />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                            <XCircle size={11} />
                            Absent
                          </span>
                        )}
                      </div>

                      {/* Check-in time */}
                      <div className="col-span-2">
                        {row.checkInTime ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-300">
                            <Clock size={12} className="text-gray-500" />
                            {formatTime(row.checkInTime)}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 text-right">
                        <button 
                          onClick={() => handleDelete(row.name)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete student"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════
          REGISTER MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {isRegistering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-[#0e1420] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold">Enrol New Student</h2>
                  <p className="text-xs text-gray-500 mt-1">The live camera will capture the student's face.</p>
                </div>
                <button onClick={() => setIsRegistering(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Student Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-600 transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 text-sm text-gray-400">
                  <Camera size={20} className="text-blue-400 flex-shrink-0" />
                  <p>Position the student in front of the camera, then click <strong className="text-white">Capture & Enrol</strong>.</p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setIsRegistering(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-sm font-bold">
                    Capture & Enrol
                  </button>
                </div>

                {regStatus.message && (
                  <p className={`text-center text-sm mt-2 ${regStatus.type === "error" ? "text-red-400" : regStatus.type === "success" ? "text-emerald-400" : "text-blue-400"}`}>
                    {regStatus.message}
                  </p>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
