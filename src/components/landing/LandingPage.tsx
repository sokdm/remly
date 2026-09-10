import React, { useState } from 'react';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import {
  Sparkles,
  GraduationCap,
  Palette,
  Calendar,
  Award,
  Zap,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BookOpen,
  TrendingUp,
  Cpu,
  Clock,
  Flame,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode?: 'login' | 'register', role?: 'student' | 'creator') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Can one person be both a Student and a Creator on Remly?',
      a: 'Yes! While you pick a primary starting role during initial registration for tailored onboarding, your account can seamlessly access both the student academic suite and the creator generative studio.',
    },
    {
      q: `What makes ${REMLY_CONFIG.aiTutorName} different from generic chatbots?`,
      a: `${REMLY_CONFIG.aiTutorName} features persistent long-term student memory, homework image analysis, Socratic reasoning, and direct hooks into class scheduling and personalized exam generation. It tracks your learning goals, weak topics, and streaks over time.`,
    },
    {
      q: 'How does the Smart Exam monitoring work?',
      a: 'Remly respects student privacy while safeguarding academic integrity. During assessments, it records transparent browser visibility metrics (such as tab switches and session interruptions) rather than intrusive video surveillance.',
    },
    {
      q: 'Is Remly installable on mobile devices as an app?',
      a: 'Yes. Remly is fully PWA-compliant. You can install it on Android, iOS, Windows, or Mac directly from the browser with zero store delays, and it supports future packaging for the Google Play Store.',
    },
    {
      q: 'What creator tools are currently live?',
      a: 'Creators can immediately use our Prompt-to-Image studio with customizable styles and aspect ratios. Roadmap tools like AI Video, Script Writer, and Content Calendars are architected for seamless roll-out.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* ---------------- 1. HERO SECTION ---------------- */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-sky-400 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Adaptive Learning & Creator Ecosystem</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-heading leading-tight">
            Learn with Intelligence.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
              Create without Limits.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto font-normal">
            Remly combines an adaptive, memory-empowered <strong>AI Tutor</strong> with smart scheduling and proctored exams, alongside a dedicated <strong>Creator AI Studio</strong>.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuth('register', 'student')}
              id="hero-cta-student"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-xl shadow-sky-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Get Started as Student</span>
            </button>

            <button
              onClick={() => onOpenAuth('register', 'creator')}
              id="hero-cta-creator"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>Explore Creator Studio</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Instant setup • No credit card required • Instant demo access available
          </p>
        </div>

        {/* Interactive Dual-Engine Preview Card */}
        <div className="mt-16 relative max-w-4xl mx-auto rounded-3xl bg-slate-900/70 border border-slate-800/80 p-4 sm:p-6 shadow-2xl backdrop-blur-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Engine Preview */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/70">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/30">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Student Wing
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Level 3 (450 XP)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs mb-3">
                <p className="text-slate-400 font-semibold mb-1">
                  {REMLY_CONFIG.aiTutorName}:
                </p>
                <p className="text-slate-200">
                  "I see you’re preparing for Calculus tomorrow. Would you like to review integrals or run a 10-minute diagnostic quiz?"
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  Physics Class • 3:00 PM
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5" />
                  5 Day Streak
                </span>
              </div>
            </div>

            {/* Creator Engine Preview */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/70">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Palette className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Creator Wing
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  AI Image Studio
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs mb-3">
                <p className="text-slate-400 font-semibold mb-1">Prompt:</p>
                <p className="text-slate-200 truncate">
                  "Futuristic quantum physics laboratory diagram, digital art style..."
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  High-Res 1:1 Rendering
                </span>
                <span className="text-emerald-400 font-medium">Export Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 2. WHY REMLY ---------------- */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-800/60 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
              Why Learn and Create on Remly?
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Isolated apps create friction. Remly synthesizes learning, assessment, and creative production into one cohesive powerhouse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Persistent Cognitive Memory</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Generic chatbots forget you when you close the tab. Remly remembers your curriculum, past mistakes, and learning goals across weeks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Verifiable Academic Rigor</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Automated exams generated from your study topics, paired with non-intrusive monitoring, auto-grading, and verified XP accreditation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Creator Studio Integration</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Educators and creators can immediately generate diagrams, illustrations, and concept art to bring subjects to life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3. STUDENT EXPERIENCE ---------------- */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase font-bold text-sky-400 tracking-wider">
              Student Platform
            </span>
            <h2 className="text-3xl font-bold text-white font-heading mt-2">
              Your Personal Academic Mentor Available 24/7
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Experience learning tailored strictly to your pace. Upload homework photos, chat via real-time streaming, schedule recurring study sessions, and track your XP level.
            </p>

            <ul className="space-y-3 mt-6 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span><strong>Multimodal homework scanner</strong> — upload math equations, charts, and diagrams</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span><strong>Automated class scheduling</strong> — AI extracts dates, subjects, and syncs reminders</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span><strong>Adaptive XP engine</strong> — earn verified progression for lessons, quizzes, and streaks</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span><strong>ElevenLabs voice integration</strong> — natural male and female spoken explanations</span>
              </li>
            </ul>

            <button
              onClick={() => onOpenAuth('register', 'student')}
              className="mt-8 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sky-500/20"
            >
              Start Learning Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Graphic Showcase Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  R
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{REMLY_CONFIG.aiTutorName}</h4>
                  <p className="text-[10px] text-emerald-400 font-medium">● Online • Streaming Active</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Student: RML-A8F492BC</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 max-w-[85%] ml-auto text-slate-200">
                Can you explain Newton's Second Law with an example, and schedule a physics review every Tuesday at 4pm?
              </div>
              <div className="bg-sky-950/30 p-3 rounded-2xl border border-sky-500/20 max-w-[88%] text-sky-100">
                <p className="font-semibold text-sky-300 mb-1">{REMLY_CONFIG.aiTutorName}:</p>
                <p className="leading-relaxed">
                  Newton's Second Law states that force equals mass times acceleration (F = m × a). For instance, pushing an empty shopping cart vs a heavy cart with identical force results in different acceleration.
                </p>
                <div className="mt-2.5 p-2 rounded-xl bg-slate-950/70 border border-sky-500/30 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">✅ Class Scheduled: Physics (Tuesday 16:00)</span>
                  <span className="text-sky-400 font-bold">+80 XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 4. CREATOR EXPERIENCE ---------------- */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-800/60 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-400" />
                Prompt to Image Studio
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-medium">
                1:1 Square • Digital Art
              </span>
            </div>
            <div className="w-full aspect-square max-h-72 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border border-indigo-500/20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                "Biological cell mitosis illustration, educational poster"
              </p>
              <span className="text-[10px] text-slate-400 mt-1">Generated in 1.2s • Ready for Download</span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
              Creator Studio
            </span>
            <h2 className="text-3xl font-bold text-white font-heading mt-2">
              Transform Ideas into Educational Assets
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Design stunning educational visuals, custom lesson thumbnails, and diagrams with state-of-the-art AI generation. Store, manage, and download your generation history directly.
            </p>

            <ul className="space-y-3 mt-6 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Multi-style selector</strong> — Photorealistic, Digital Art, Concept Art, Minimalist</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Aspect ratio controls</strong> — 1:1, 16:9 widescreen, 9:16 mobile story, 4:3</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span><strong>Generation library</strong> — export, redownload, or manage creative records anytime</span>
              </li>
            </ul>

            <button
              onClick={() => onOpenAuth('register', 'creator')}
              className="mt-8 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              Open Creator Studio
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- 5. HOW IT WORKS ---------------- */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
            How Remly Works
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Get started in under 60 seconds with our seamless onboarding
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center relative">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-sm flex items-center justify-center mx-auto mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-white">Create Your Account</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Register as a Student or Creator. Receive an immutable UID and set your learning preferences.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center mx-auto mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-white">Engage & Practice</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Converse with {REMLY_CONFIG.aiTutorName}, upload diagrams, solve exams, or generate studio imagery.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center mx-auto mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-white">Track Progress & Level Up</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Accumulate XP, climb academic tiers, unlock study streaks, and download your verified assets.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 6. PRICING PREVIEW ---------------- */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-800/60 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
              Transparent & Accessible Plans
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Start free. Upgrade as your learning or creator workflows expand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Starter</span>
                <h3 className="text-2xl font-bold text-white mt-1">$0</h3>
                <p className="text-xs text-slate-400 mt-2">Perfect for getting started with AI tutoring.</p>
                <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Daily AI Tutor sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Standard exams & quizzes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>5 AI image generations / month</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onOpenAuth('register', 'student')}
                className="w-full mt-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Start Free
              </button>
            </div>

            {/* Student Pro */}
            <div className="p-6 rounded-3xl bg-slate-900 border-2 border-sky-500 shadow-xl shadow-sky-500/10 flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <span className="text-xs font-semibold text-sky-400 uppercase">Student Pro</span>
                <h3 className="text-2xl font-bold text-white mt-1">
                  $12 <span className="text-xs font-normal text-slate-400">/mo</span>
                </h3>
                <p className="text-xs text-slate-400 mt-2">Unlimited mentoring, voice synthesis, and auto-exams.</p>
                <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Unlimited {REMLY_CONFIG.aiTutorName} sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Multimodal homework image analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>ElevenLabs AI Voice synthesis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Automated AI exam generator</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onOpenAuth('register', 'student')}
                className="w-full mt-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-md shadow-sky-500/25"
              >
                Join Student Pro
              </button>
            </div>

            {/* Creator Studio */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase">Creator Studio</span>
                <h3 className="text-2xl font-bold text-white mt-1">
                  $24 <span className="text-xs font-normal text-slate-400">/mo</span>
                </h3>
                <p className="text-xs text-slate-400 mt-2">Full creative suite with high-res generation & future video tools.</p>
                <ul className="space-y-2.5 mt-6 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>High-resolution image generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Unlimited download & asset export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Early access to AI Video & Script tools</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => onOpenAuth('register', 'creator')}
                className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
              >
                Get Creator Studio
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 7. FAQ SECTION ---------------- */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-white hover:text-sky-400"
              >
                <span>{item.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 8. FINAL CTA ---------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full mb-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-sky-900/40 via-indigo-900/40 to-slate-900 border border-sky-500/30 text-center relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-heading">
            Ready to Experience Remly?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto">
            Join thousands of learners and creators elevating their minds and workflows today.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onOpenAuth('register', 'student')}
              className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-xl shadow-sky-500/25 transition transform active:scale-95"
            >
              Sign Up as Student
            </button>
            <button
              onClick={() => onOpenAuth('register', 'creator')}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition"
            >
              Sign Up as Creator
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- 9. FOOTER ---------------- */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-white font-heading tracking-wider">
              {REMLY_CONFIG.appName}
            </span>
            <span>• Adaptive Learning & Creator Intelligence</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Remly guarantees student data privacy and security.'); }} className="hover:text-slate-300">Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service: Standard educational usage terms apply.'); }} className="hover:text-slate-300">Terms of Service</a>
            <a href="#compliance" onClick={(e) => { e.preventDefault(); alert('Academic Integrity & Compliance Guidelines active.'); }} className="hover:text-slate-300">Academic Compliance</a>
          </div>
          <p>© {new Date().getFullYear()} {REMLY_CONFIG.appName} Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
