import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Exam, ExamAttempt } from '../../types';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import {
  BookOpen,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ExamsView: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Exam State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [tabSwitchesCount, setTabSwitchesCount] = useState(0);
  const [examResult, setExamResult] = useState<ExamAttempt | null>(null);

  // AI Exam Generator Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTopic, setGenerateTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchExamsAndAttempts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/exams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      console.warn('Exams fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndAttempts();
  }, [token]);

  // Exam Proctoring: Transparent Tab Visibility Change Detection
  useEffect(() => {
    if (!activeExam || !activeAttempt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchesCount((prev) => {
          const next = prev + 1;
          // Report event to backend
          fetch('/api/exams/event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              attemptId: activeAttempt.id,
              eventType: 'tab_switch',
              details: `Student switched away from exam tab (Instance #${next})`,
            }),
          });
          return next;
        });
        showToast('Academic Integrity: Tab switch detected and recorded.', 'warning');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeExam, activeAttempt, token]);

  // Exam Countdown Timer
  useEffect(() => {
    if (!activeExam || timeLeftSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeExam, timeLeftSeconds]);

  // Start Exam
  const handleStartExam = async (examId: string) => {
    try {
      const startRes = await fetch(`/api/exams/${examId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        showToast(startData.error || 'Cannot start exam.', 'error');
        return;
      }

      const examRes = await fetch(`/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const examData = await examRes.json();

      setActiveExam(examData.exam);
      setActiveAttempt(startData.attempt);
      setTimeLeftSeconds(examData.exam.durationMinutes * 60);
      setTabSwitchesCount(0);
      setAnswers({});
      setExamResult(null);
    } catch (err) {
      showToast('Error initializing exam session.', 'error');
    }
  };

  // Submit Exam
  const handleSubmitExam = async () => {
    if (!activeExam || !activeAttempt) return;

    try {
      const res = await fetch(`/api/exams/${activeExam.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attemptId: activeAttempt.id,
          answers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setExamResult(data.result);
        setActiveExam(null);
        setActiveAttempt(null);
        fetchExamsAndAttempts();
        refreshProfile();

        if (data.result.status === 'passed') {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } else {
        showToast(data.error || 'Failed to submit exam.', 'error');
      }
    } catch (err) {
      showToast('Network error during submission.', 'error');
    }
  };

  // Generate Custom Exam with AI Tutor
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateTopic.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/exams/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: generateTopic.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setShowGenerateModal(false);
        setGenerateTopic('');
        fetchExamsAndAttempts();
      } else {
        showToast(data.error || 'Failed to generate assessment.', 'error');
      }
    } catch (err) {
      showToast('AI Exam generation error.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ----------------- ACTIVE EXAM SESSION -----------------
  if (activeExam) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Sticky Exam Proctoring Header */}
        <div className="sticky top-20 z-30 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-6 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 uppercase">
              {activeExam.subject}
            </span>
            <h2 className="text-base font-bold text-white mt-1">{activeExam.title}</h2>
          </div>

          <div className="flex items-center gap-4">
            {tabSwitchesCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {tabSwitchesCount} Focus Flag{tabSwitchesCount > 1 ? 's' : ''}
              </span>
            )}

            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm font-bold text-sky-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {activeExam.questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <span className="text-xs font-bold text-sky-400">
                  Question {idx + 1} of {activeExam.questions.length}
                </span>
                <span className="text-[11px] text-slate-400">{q.points} Points</span>
              </div>

              <p className="text-sm font-semibold text-white leading-relaxed mb-4">
                {q.question}
              </p>

              {q.type === 'multiple_choice' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={`p-3.5 rounded-2xl border cursor-pointer text-xs font-medium flex items-center gap-3 transition ${
                        answers[q.id] === opt
                          ? 'bg-sky-500/20 border-sky-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                        className="hidden"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          answers[q.id] === opt ? 'border-sky-400 bg-sky-500' : 'border-slate-600'
                        }`}
                      >
                        {answers[q.id] === opt && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'short_answer' && (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Type your concise answer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              )}

              {q.type === 'written' && (
                <textarea
                  rows={4}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Explain in full sentences..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 pt-4 flex items-center justify-between border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {Object.keys(answers).length} of {activeExam.questions.length} questions answered
          </span>

          <button
            onClick={handleSubmitExam}
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sky-500/25"
          >
            <span>Finish & Submit Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ----------------- DEFAULT EXAMS LIST VIEW -----------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Custom Exam Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Academic Examinations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Standard and AI-generated assessments to test mastery and earn XP.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Custom Exam with AI</span>
        </button>
      </div>

      {/* Result Dialog Modal */}
      {examResult && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-sky-500/40 shadow-2xl animate-in fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              {examResult.status === 'passed' ? (
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" /> PASSED ({examResult.score}%)
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-500/30">
                  <XCircle className="w-4 h-4" /> NEEDS REVIEW ({examResult.score}%)
                </span>
              )}
              <span className="text-xs font-bold text-sky-400">+{examResult.xpEarned} XP Awarded</span>
            </div>
            <h3 className="text-base font-bold text-white mt-2">{examResult.examTitle}</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              <strong>{REMLY_CONFIG.aiTutorName} Feedback:</strong> {examResult.feedback}
            </p>
          </div>
          <button
            onClick={() => setExamResult(null)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Available Exams Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          Available Assessments ({exams.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 uppercase">
                    {exam.subject}
                  </span>
                  {exam.isAutoGenerated && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Generated
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mt-2">{exam.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{exam.description}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 space-x-3">
                  <span>{exam.durationMinutes} mins</span>
                  <span>•</span>
                  <span>Pass: {exam.passingScore}%</span>
                </div>

                <button
                  onClick={() => handleStartExam(exam.id)}
                  className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-md shadow-sky-500/20"
                >
                  Start Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Exam Attempts History */}
      {attempts.length > 0 && (
        <div className="pt-6 border-t border-slate-800/80">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Recent Exam Records & Proctoring Logs
          </h2>

          <div className="space-y-3">
            {attempts.map((att) => (
              <div
                key={att.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{att.examTitle}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        att.status === 'passed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {att.status} ({att.score}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Submitted: {new Date(att.submissionTime || att.startTime).toLocaleDateString()} at{' '}
                    {new Date(att.submissionTime || att.startTime).toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Tab Switches: {att.tabSwitches || 0}</span>
                  <span className="font-bold text-sky-400">+{att.xpEarned || 0} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Exam Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white font-heading">
                Generate Custom Exam with AI
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Enter any topic, concept, or curriculum subject. {REMLY_CONFIG.aiTutorName} will formulate a verified, multi-question assessment and add it to your exam suite.
            </p>

            <form onSubmit={handleGenerateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Topic or Subject
                </label>
                <input
                  type="text"
                  required
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  placeholder="e.g. Thermodynamics, JavaScript Promises, Photosynthesis"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !generateTopic.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Formulating Questions...
                    </>
                  ) : (
                    'Generate Exam'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
