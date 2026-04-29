"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Users, Clock, UserPlus, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceLog {
  Name: string;
  Time: string;
}

export default function Home() {
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [stats, setStats] = useState({ total_logs: 0, unique_students: 0, last_entry: 'None' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });

  const fetchAttendance = async () => {
    try {
      const res = await fetch('http://localhost:8000/attendance');
      const data = await res.json();
      setAttendance(data.reverse()); // Show latest first
    } catch (err) {
      console.error("Failed to fetch attendance");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats");
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchStats();
    const interval = setInterval(() => {
      fetchAttendance();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      setStatus({ message: 'Please enter a name.', type: 'error' });
      return;
    }
    
    setStatus({ message: 'Capturing...', type: 'info' });
    
    try {
      const res = await fetch(`http://localhost:8000/register_capture?name=${encodeURIComponent(newName)}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        setStatus({ message: data.message, type: 'success' });
        setNewName('');
        setTimeout(() => setIsRegistering(false), 2000);
      } else {
        setStatus({ message: data.message, type: 'error' });
      }
    } catch (err) {
      setStatus({ message: 'Failed to connect to backend.', type: 'error' });
    }
  };

  return (
    <main className="min-h-screen p-8 bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            VisionGuard Attendance
          </h1>
          <p className="text-gray-400 mt-2">Automated Real-time Recognition System</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-full transition-all glow"
          >
            <UserPlus size={20} />
            Register Student
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Live Feed Section */}
        <section className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl overflow-hidden relative group">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1 bg-red-500/80 rounded-full text-xs font-bold animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
              LIVE FEED
            </div>
            <img 
              src="http://localhost:8000/video_feed" 
              alt="Webcam Feed" 
              className="w-full h-auto aspect-video object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&q=80&w=1000";
                e.currentTarget.className = "w-full aspect-video object-cover opacity-20";
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-4">
                <ShieldCheck className="text-emerald-400" />
                <span className="text-sm font-medium">System Active: Scanning for Faces...</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Logs', value: stats.total_logs, icon: Clock, color: 'text-blue-400' },
              { label: 'Registered', value: stats.unique_students, icon: Users, color: 'text-emerald-400' },
              { label: 'Last Seen', value: stats.last_entry, icon: Camera, color: 'text-purple-400' },
            ].map((stat, i) => (
              <div key={i} className="glass p-6 rounded-2xl flex flex-col items-center text-center">
                <stat.icon className={`${stat.color} mb-3`} size={24} />
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar: Attendance Log */}
        <aside className="space-y-6">
          <div className="glass rounded-3xl p-6 h-[calc(100vh-200px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users size={20} className="text-blue-400" />
                Recent Activity
              </h2>
              <button onClick={fetchAttendance} className="text-gray-400 hover:text-white transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              <AnimatePresence>
                {attendance.map((log, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                        {log.Name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{log.Name}</p>
                        <p className="text-[10px] text-gray-500">{new Date(log.Time).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-bold uppercase">
                        Present
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {attendance.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Clock size={48} className="mb-4 opacity-20" />
                  <p>No activity recorded today</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Registration Modal Overlay */}
      <AnimatePresence>
        {isRegistering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass p-8 rounded-3xl max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">New Student Enrollment</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Student Name</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="p-6 border-2 border-dashed border-blue-500/30 rounded-2xl text-center text-gray-400 bg-blue-500/5">
                  <Camera size={32} className="mx-auto mb-2 text-blue-400" />
                  <p className="text-sm">Position yourself in the live feed</p>
                  <p className="text-xs text-gray-500 mt-1">We will capture the current frame</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all glow font-bold"
                  >
                    Begin Capture
                  </button>
                </div>
                {status.message && (
                  <p className={`mt-4 text-center text-sm ${status.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                    {status.message}
                  </p>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
