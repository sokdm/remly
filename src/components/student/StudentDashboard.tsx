import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import { ScheduledClass, Exam } from '../../types';
import {
  Sparkles,
  Calendar,
  Award,
  BookOpen,
  ArrowRight,
  Flame,
  Clock,
  AlertTriangle,
  Play,
  PlusCircle,
  FileCheck2,
  Users,
  MessageSquare,
  Globe,
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (view: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [clsRes, exRes] = await Promise.all([
          fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/exams', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (clsRes.ok) {
          const clsData = await clsRes.json();
          setClasses(clsData.classes || []);
        }
        if (exRes.ok) {
          const exData = await exRes.json();
          setExams(exData.exams || []);
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (!user) return null;

  const currentXp = user.xp || 0;
  const currentLevel = user.level || 1;
  const nextLevelXp = REMLY_CONFIG.calculateXpForNextLevel(currentLevel);
  const currentBaseXp = REMLY_CONFIG.levelMilestones[currentLevel - 1] || 0;
  const levelProgress = Math.min(
    100,
    Math.round(((currentXp - currentBaseXp) / (nextLevelXp - currentBaseXp)) * 100)
  );

  const nextClass = classes.find((c) => c.status === 'active');
  const availableExams = exams.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Missed Exams Compliance Alert Banner */}
      {user.missedExamsCount && user.missedExamsCount > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-amber-900 dark:text-white">Academic Compliance Notice</p>
              <p className="text-amber-700 dark:text-amber-300/90 mt-0.5">
                You have {user.missedExamsCount} recorded missed exam deadline(s).
                {user.academicRestricted
                  ? ' Assessment features are temporarily restricted. Please contact Academic Review.'
                  : ' Please ensure you sit for scheduled evaluations promptly.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('exams')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-500/40 transition shrink-0"
          >
            Review Exams
          </button>
        </div>
      ) : null}

      {/* Top Welcome Header & XP Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Profile / Greeting Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}
                alt={user.fullName}
                className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-sky-500/30 object-cover shadow-lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">{user.fullName}</h1>
                  <span className="text-base" title={user.country}>
                    {REMLY_CONFIG.countries.find((c) => c.name === user.country)?.flag || '🌐'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                    UID: {user.uid}
                  </span>
                  <span>@{user.username}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{user.learningStreak || 1} Day Streak</span>
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-500" />
                Current Level: <strong className="text-sky-600 dark:text-sky-400">Level {currentLevel}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {currentXp} / {nextLevelXp} XP ({levelProgress}% to Level {currentLevel + 1})
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500 shadow-sm"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Launch Card for AI Tutor */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              {REMLY_CONFIG.aiTutorName}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Ask questions, upload diagrams, or converse with AI voice mode directly through conversational learning.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => onNavigate('tutor')}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-sky-500/20"
            >
              <span>Start Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Community Hub Feature Banner (User Request Highlight) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">
              <Globe className="w-3 h-3" />
              <span>Worldwide Learning Network</span>
            </div>
            <h3 className="text-lg font-bold text-white font-heading">Remly Global Community Hub</h3>
            <p className="text-xs text-emerald-100 mt-0.5 max-w-xl">
              Connect with students and creators globally. Send voice notes, share homework photos, react with stickers, and ask Remly AI questions anytime.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('community')}
          id="btn-dashboard-enter-community"
          className="px-5 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-lg transition flex items-center gap-2 shrink-0"
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Enter Community Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Middle Section: Upcoming Class & Available Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Scheduled Class */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Upcoming Class
                </h3>
              </div>
              <button
                onClick={() => onNavigate('classes')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
              >
                View all ({classes.length})
              </button>
            </div>

            {nextClass ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 uppercase">
                      {nextClass.subject}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2">{nextClass.topic}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Goal: {nextClass.learningGoal || 'Concept deep dive'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      {nextClass.time}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {nextClass.days.join(', ')}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {nextClass.durationMinutes} min session
                  </span>
                  <button
                    onClick={() => onNavigate('tutor')}
                    className="px-3 py-1 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Join with AI Tutor
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">No upcoming classes scheduled.</p>
                <button
                  onClick={() => onNavigate('classes')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold transition"
                >
                  Schedule Your First Class
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>Automated reminders enabled</span>
            <span>+80 XP on completion</span>
          </div>
        </div>

        {/* Exams & Assessments */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Academic Assessments
                </h3>
              </div>
              <button
                onClick={() => onNavigate('exams')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                All Exams ({exams.length})
              </button>
            </div>

            <div className="space-y-2.5">
              {availableExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{exam.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {exam.subject} • {exam.durationMinutes} mins • {exam.questions.length} questions
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('exams')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-500/30 transition"
                  >
                    Take Exam
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">+150 XP on passing</span>
            <button
              onClick={() => onNavigate('exams')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Generate Custom Exam with AI
            </button>
          </div>
        </div>
      </div>

      {/* Interactive AI Prompt Launcher & Assignment Solver */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ask Remly AI Tutor Quick Box */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ask {REMLY_CONFIG.aiTutorName}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Instant Socratic tutoring, homework breakdown & step-by-step guidance</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('tutor')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Open Full Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onNavigate('tutor')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 transition cursor-pointer flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span className="text-xs">Ask a question or describe a problem you're stuck on...</span>
            <span className="px-3 py-1 rounded-xl bg-sky-500 text-white text-xs font-bold shrink-0">
              Ask AI
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              "Explain Newton's Laws with real examples",
              "How does JavaScript Event Loop work?",
              "Help me prepare for my Physics exam",
              "Create a 7-day study plan for finals",
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate('tutor')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700/60 transition"
              >
                💡 {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* AI Assignment Solver Card (Student Academic Tool) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-slate-200 dark:border-emerald-500/30 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                AI Assignment Solver
              </h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                +25 XP
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Snap a photo of your textbook question, handwritten math problem, or test sheet to get step-by-step verified solutions and clean derivations.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => onNavigate('assignments')}
              id="btn-dashboard-assignment-solver"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <span>Solve Homework & Assignments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
