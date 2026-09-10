import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CreatorGeneration } from '../../types';
import {
  Palette,
  Sparkles,
  Image as ImageIcon,
  Video,
  FileText,
  Layout,
  ArrowRight,
  TrendingUp,
  Download,
  Clock,
  Layers,
} from 'lucide-react';

interface CreatorDashboardProps {
  onNavigate: (view: string) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const [generations, setGenerations] = useState<CreatorGeneration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/creator/generations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((data) => setGenerations(data.history || []))
      .catch((err) => console.warn('Creator history error:', err))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
              Creator Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">UID: {user.uid}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading">
            Welcome, {user.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Design high-impact visual assets, educational diagrams, and creative materials powered by Remly's generative engine.
          </p>
        </div>

        <button
          onClick={() => onNavigate('creator-generator')}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/25 transition flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Palette className="w-4 h-4" />
          <span>Launch AI Image Studio</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Total Generations</span>
          <p className="text-2xl font-bold text-white mt-1">{generations.length}</p>
          <span className="text-[10px] text-emerald-400 mt-1 block">Full Resolution Available</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Studio Storage</span>
          <p className="text-2xl font-bold text-white mt-1">Unlimited</p>
          <span className="text-[10px] text-indigo-400 mt-1 block">Cloud Synced</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Creator Tier</span>
          <p className="text-2xl font-bold text-white mt-1">Studio Pro</p>
          <span className="text-[10px] text-sky-400 mt-1 block">All Styles Unlocked</span>
        </div>
      </div>

      {/* Recent Generations Showcase */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Recent Generations ({generations.length})
          </h2>
          <button
            onClick={() => onNavigate('creator-generator')}
            className="text-xs text-indigo-400 hover:underline font-semibold"
          >
            Open Image Studio
          </button>
        </div>

        {generations.length === 0 ? (
          <div className="p-10 rounded-3xl bg-slate-900/60 border border-slate-800 text-center">
            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">No images generated yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Create your first educational diagram or digital artwork with our Prompt-to-Image AI.
            </p>
            <button
              onClick={() => onNavigate('creator-generator')}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold transition"
            >
              Generate Image
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {generations.slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('creator-generator')}
                className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-indigo-500/50 transition"
              >
                <div className="aspect-square bg-slate-950 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] text-white">
                    {item.aspectRatio}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-slate-200 truncate font-medium">{item.prompt}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.style}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creator Roadmap: High-Value Future Tools Architecture (Step 25/26) */}
      <div className="pt-6 border-t border-slate-800/80">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Creator Suite Expansion & Pipeline (Preview)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative">
            <span className="absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Pipeline
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white">AI Video Generator</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Transform lesson prompts into short explainer videos.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative">
            <span className="absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Pipeline
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white">Script & Lesson Writer</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Structure comprehensive video transcripts and syllabi.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative">
            <span className="absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Pipeline
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Layout className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white">Thumbnail Creator</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Auto-generate YouTube and course card covers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative">
            <span className="absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Pipeline
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white">Brand Kit & Voiceover</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Maintain uniform color palettes, logos, and audio tone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
