import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AssignmentSolution } from '../../types';
import { CleanTextRenderer } from '../common/CleanTextRenderer';
import { cleanForSpeech } from '../../utils/cleanText';
import {
  FileCheck2,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  Volume2,
  VolumeX,
  Trash2,
  History,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ZoomIn,
  X,
  Layers,
  Award,
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  'General Academic',
  'Mathematics & Calculus',
  'Physics & Mechanics',
  'Chemistry & Organic',
  'Biology & Life Sciences',
  'Computer Science & Code',
  'Economics & Business',
  'Engineering & Statics',
];

export const AssignmentSolverView: React.FC = () => {
  const { user, token } = useAuth();

  // Upload & State
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('image/png');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState('Mathematics & Calculus');
  const [instructions, setInstructions] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [solution, setSolution] = useState<AssignmentSolution | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History Drawer
  const [history, setHistory] = useState<AssignmentSolution[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [copiedFullSolution, setCopiedFullSolution] = useState(false);

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch History on Mount
  useEffect(() => {
    if (!token) return;
    fetch('/api/assignment/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((data) => setHistory(data.history || []))
      .catch((err) => console.warn('Failed to load assignment history:', err));
  }, [token]);

  // Handle Image File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 15MB limit. Please choose a smaller file.');
      return;
    }

    setErrorMessage(null);
    setSelectedMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreviewUrl(result);
      const base64Data = result.split(',')[1];
      setSelectedImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Solve Assignment via API
  const handleSolve = async () => {
    if (!selectedImageBase64) {
      setErrorMessage('Please upload an image of your assignment or question first.');
      return;
    }

    setIsSolving(true);
    setErrorMessage(null);
    stopAudio();

    try {
      const response = await fetch('/api/assignment/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: selectedImageBase64,
          imageMimeType: selectedMimeType,
          subject,
          instructions: instructions.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to solve assignment.');
      }

      setSolution(data.solution);
      // Prepend to history
      setHistory((prev) => [data.solution, ...prev]);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while analyzing the image.');
    } finally {
      setIsSolving(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!solution?.finalAnswer) return;
    navigator.clipboard.writeText(solution.finalAnswer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const handleCopyFullSolution = () => {
    if (!solution) return;
    const textLines = [
      `Problem: ${solution.title}`,
      `Subject: ${solution.subject}`,
      '',
      `Question:`,
      solution.questionText,
      '',
      `Key Concepts:`,
      solution.keyConcepts.map((c) => `• ${c}`).join('\n'),
      '',
      `Step-by-Step Derivation:`,
      ...solution.stepByStepSolution.map(
        (s) => `Step ${s.stepNumber}: ${s.title}\n${s.description}\n${s.formulaOrWorking || ''}`
      ),
      '',
      `Final Answer:`,
      solution.finalAnswer,
      '',
      `Verification Tips:`,
      solution.verificationTips,
    ].join('\n');

    navigator.clipboard.writeText(textLines);
    setCopiedFullSolution(true);
    setTimeout(() => setCopiedFullSolution(false), 2000);
  };

  // Audio Explanation
  const toggleAudioExplanation = async () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    if (!solution) return;

    const narrative = [
      `Here is the step-by-step solution for ${solution.title}.`,
      `The question asks: ${solution.questionText}.`,
      ...solution.stepByStepSolution.map(
        (s) => `Step ${s.stepNumber}, ${s.title}. ${s.description}`
      ),
      `The final answer is: ${solution.finalAnswer}.`,
    ].join(' ');

    const cleanScript = cleanForSpeech(narrative);
    setIsPlayingAudio(true);

    try {
      // Try ElevenLabs natural voice
      const res = await fetch('/api/tutor/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: cleanScript.slice(0, 900),
          gender: 'female',
        }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src = data.audioUrl;
        audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
        audioPlayerRef.current.onerror = () => playBrowserSpeech(cleanScript);
        await audioPlayerRef.current.play();
        return;
      }
    } catch {
      // Fallback
    }

    playBrowserSpeech(cleanScript);
  };

  const playBrowserSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsPlayingAudio(false);
  };

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch(`/api/assignment/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (solution?.id === id) {
        setSolution(null);
      }
    } catch (err) {
      console.warn('Failed to delete assignment:', err);
    }
  };

  const resetForm = () => {
    setSelectedImageBase64(null);
    setImagePreviewUrl(null);
    setSolution(null);
    setInstructions('');
    setErrorMessage(null);
    stopAudio();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider border border-sky-500/30">
              AI Vision Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider border border-emerald-500/30">
              +25 XP per Problem
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading">
            AI Assignment & Homework Solver
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Snap or upload any worksheet, textbook question, handwritten equations, or coding assignment.
            Remly analyzes the problem and returns exhaustive step-by-step working and final answers with zero symbol clutter.
          </p>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          id="btn-toggle-assignment-history"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-md"
        >
          <History className="w-4 h-4 text-sky-400" />
          <span>Solved History ({history.length})</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Options (5 columns on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-sky-400" />
                <span>Upload Assignment Image</span>
              </h3>
              {imagePreviewUrl && (
                <button
                  onClick={resetForm}
                  className="text-xs text-rose-400 hover:underline font-semibold"
                >
                  Clear Image
                </button>
              )}
            </div>

            {/* Hidden input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
            />

            {/* Dropzone or Preview */}
            {!imagePreviewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-sky-500/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-950/40 hover:bg-slate-950/80 transition group"
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition">
                  Click to browse or drag & drop photo
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Supports PNG, JPG, JPEG, or WebP. Take a photo of your handwritten homework, textbook, or test paper.
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded assignment"
                  className="w-full max-h-72 object-contain mx-auto"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold border border-slate-700 backdrop-blur-md transition flex items-center gap-1.5 shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace Photo</span>
                </button>
              </div>
            )}

            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-sky-500 transition"
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific Instructions / Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Target Question or Instructions (Optional)
                </label>
                <span className="text-[10px] text-slate-500">e.g. "Solve #2b"</span>
              </div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                placeholder="e.g. Focus on Question 3 only, or show alternative method, or verify my work..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition resize-none"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Solve Button */}
            <button
              onClick={handleSolve}
              disabled={isSolving || !selectedImageBase64}
              id="btn-solve-assignment"
              className={`
                w-full py-3.5 rounded-xl font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-xl
                ${
                  isSolving || !selectedImageBase64
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25'
                }
              `}
            >
              {isSolving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
                  <span>Scanning Image & Deriving Solution...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Solve Assignment & Explain</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Solution Output or Empty State (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {solution ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-300">
              {/* Solution Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider border border-sky-500/30">
                    {solution.subject || 'Academic Solution'}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {solution.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAudioExplanation}
                    title={isPlayingAudio ? 'Stop explanation' : 'Listen to solution'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                      isPlayingAudio
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyFullSolution}
                    title="Copy full explanation to clipboard"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {copiedFullSolution ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Solution</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1. Problem Detected Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Transcribed Question / Problem Statement
                </span>
                <p className="text-sm font-medium text-slate-200 leading-relaxed">
                  {solution.questionText}
                </p>
              </div>

              {/* 2. Key Concepts */}
              {solution.keyConcepts && solution.keyConcepts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Core Principles & Governing Formulas
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {solution.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Step-by-Step Derivations */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Step-by-Step Derivation & Explanation
                </span>
                <div className="space-y-3">
                  {solution.stepByStepSolution.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-md shadow-sky-500/30">
                          {step.stepNumber}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {step.title}
                        </h4>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                        {step.description}
                      </p>

                      {step.formulaOrWorking && (
                        <div className="ml-8 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-sky-300 font-mono">
                          {step.formulaOrWorking}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Highlighted Final Answer Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-emerald-950/30 border border-emerald-500/40 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Definitive Final Answer</span>
                  </span>

                  <button
                    onClick={handleCopyAnswer}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition flex items-center gap-1"
                  >
                    {copiedAnswer ? 'Copied' : 'Copy Answer'}
                  </button>
                </div>

                <div className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {solution.finalAnswer}
                </div>
              </div>

              {/* 5. Verification & Exam Tips */}
              {solution.verificationTips && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    Exam Verification & Sanity Check
                  </span>
                  <p>{solution.verificationTips}</p>
                </div>
              )}
            </div>
          ) : isSolving ? (
            /* Loading State Animation */
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center space-y-4 min-h-[420px]">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-sky-500/10 border-2 border-sky-400 border-t-transparent animate-spin" />
                <Sparkles className="w-8 h-8 text-sky-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">Remly Neural Vision at Work</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Dissecting problem parameters, applying formulas, and constructing step-by-step working...
              </p>
            </div>
          ) : (
            /* Empty State */
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center flex flex-col items-center justify-center space-y-4 min-h-[420px]">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 text-slate-500 flex items-center justify-center">
                <FileCheck2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">No Assignment Active</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Upload a photo of your homework problem, handwritten math, science equation, or test question on the left to receive a comprehensive, verified solution.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Slide-over Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-sky-400" />
                    <span>Solved Assignments ({history.length})</span>
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* History List */}
                <div className="mt-6 space-y-3 overflow-y-auto max-h-[70vh] pr-1">
                  {history.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">
                      No assignments solved yet. Upload an image to start!
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSolution(item);
                          setShowHistory(false);
                        }}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider block">
                              {item.subject || 'General'}
                            </span>
                            <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition truncate">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.questionText}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          <span className="text-emerald-400 font-semibold truncate max-w-[150px]">
                            {item.finalAnswer}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-center">
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition border border-slate-800"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
