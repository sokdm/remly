import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ScheduledClass } from '../../types';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import {
  Calendar,
  Clock,
  Plus,
  X,
  Play,
  Trash2,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface ClassesViewProps {
  onStartClassSession: (cls: ScheduledClass) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ onStartClassSession }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Class Form State
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('');
  const [time, setTime] = useState('15:00');
  const [duration, setDuration] = useState('45');
  const [learningGoal, setLearningGoal] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday']);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchClasses = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.warn('Classes fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [token]);

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !topic) {
      showToast('Subject and topic are required.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          topic,
          time,
          durationMinutes: Number(duration),
          learningGoal: learningGoal || 'Mastery of foundational principles',
          days: selectedDays,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Class scheduled! Notification and reminder activated.', 'success');
        setShowModal(false);
        setTopic('');
        setLearningGoal('');
        fetchClasses();
      } else {
        showToast(data.error || 'Failed to schedule class.', 'error');
      }
    } catch (err) {
      showToast('Network error while scheduling class.', 'error');
    }
  };

  const handleCancelClass = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled class?')) return;
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Class cancelled.', 'info');
        setClasses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      showToast('Failed to cancel class.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Class Schedule</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize your recurring study sessions with {REMLY_CONFIG.aiTutorName}.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sky-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Class</span>
        </button>
      </div>

      {/* Class List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading your schedule...</div>
      ) : classes.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Classes Scheduled Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Plan your learning journey or ask {REMLY_CONFIG.aiTutorName} in chat to schedule classes for you automatically!
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold transition"
          >
            Create First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 uppercase">
                    {cls.subject}
                  </span>
                  <span className="text-xs font-bold text-slate-300 font-mono">
                    {cls.time}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-2">{cls.topic}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  <strong>Goal:</strong> {cls.learningGoal}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {cls.days.map((day) => (
                    <span
                      key={day}
                      className="px-2 py-0.5 rounded-md bg-slate-950 text-[10px] text-slate-400 border border-slate-800"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {cls.durationMinutes} mins
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCancelClass(cls.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Cancel class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onStartClassSession(cls)}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3" />
                    <span>Join Class</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white font-heading">Schedule a New Class</h2>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Literature">Literature</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quantum Mechanics Fundamentals"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Available Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        selectedDays.includes(day)
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Learning Goal
                  </label>
                  <input
                    type="text"
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="e.g. Master formula derivations"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg shadow-sky-500/20"
              >
                Save Class Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
