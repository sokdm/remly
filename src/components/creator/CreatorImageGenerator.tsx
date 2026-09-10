import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CreatorGeneration } from '../../types';
import {
  Palette,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Maximize2,
  X,
  Share2,
} from 'lucide-react';

export const CreatorImageGenerator: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Digital Art');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '9:16'>('1:1');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<CreatorGeneration | null>(null);
  const [history, setHistory] = useState<CreatorGeneration[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<CreatorGeneration | null>(null);

  const styles = [
    'Digital Art',
    'Educational Diagram',
    'Photorealistic',
    'Concept Art',
    'Minimalist Graphic',
    '3D Illustration',
  ];

  const aspectRatios = [
    { label: '1:1 Square', value: '1:1' },
    { label: '16:9 Widescreen', value: '16:9' },
    { label: '4:3 Standard', value: '4:3' },
    { label: '9:16 Story', value: '9:16' },
  ];

  const promptSuggestions = [
    'Cross section of an animal cell with annotated organelles',
    'Solar system planetary alignment in vibrant neon digital art',
    'Human brain synaptic neural transmission with glowing electrical pulses',
    'Ancient Roman Colosseum architectural isometric blueprint',
  ];

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/creator/generations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        if (!currentImage && data.history?.length > 0) {
          setCurrentImage(data.history[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/creator/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: textToUse.trim(),
          style,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (res.ok && data.image) {
        setCurrentImage(data.image);
        setHistory((prev) => [data.image, ...prev]);
        showToast('Image generated successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to generate image.', 'error');
      }
    } catch (err) {
      showToast('Generation network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/creator/generations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Image removed from library.', 'info');
        setHistory((prev) => prev.filter((item) => item.id !== id));
        if (currentImage?.id === id) {
          setCurrentImage(null);
        }
        if (previewModalImage?.id === id) {
          setPreviewModalImage(null);
        }
      }
    } catch (err) {
      showToast('Failed to delete image.', 'error');
    }
  };

  const handleDownload = (imgUrl: string, filename = 'remly-artwork') => {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download started.', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Studio Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white font-heading">AI Image Studio</h1>
        </div>
        <p className="text-xs text-slate-400">
          Craft high-resolution visual artwork, textbook graphics, and creative assets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Controls (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Visual Prompt
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate in rich detail..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Prompt Suggestion Chips */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Inspiration Prompts
            </span>
            <div className="space-y-1.5">
              {promptSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(item)}
                  className="w-full text-left p-2 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 text-[11px] text-slate-400 hover:text-slate-200 transition truncate block"
                >
                  "{item}"
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Artistic Style</label>
            <div className="grid grid-cols-2 gap-2">
              {styles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition text-left truncate ${
                    style === s
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              {aspectRatios.map((ar) => (
                <button
                  key={ar.value}
                  type="button"
                  onClick={() => setAspectRatio(ar.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition text-left truncate ${
                    aspectRatio === ar.value
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Action Button */}
          <button
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || loading}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Canvas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </div>

        {/* Right Canvas Display (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between min-h-[460px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse mb-4">
                  <Palette className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-base font-bold text-white">Generating Your Creation</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Neural model is rendering textures, geometry, and stylistic lighting...
                </p>
              </div>
            ) : currentImage ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative group flex items-center justify-center max-h-[480px]">
                  <img
                    src={currentImage.imageUrl}
                    alt={currentImage.prompt}
                    className="w-full h-auto max-h-[480px] object-contain rounded-2xl"
                  />
                  <button
                    onClick={() => setPreviewModalImage(currentImage)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition shadow-lg"
                    title="Fullscreen Preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="max-w-md">
                    <p className="text-xs font-semibold text-white truncate">
                      "{currentImage.prompt}"
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                        {currentImage.style}
                      </span>
                      <span>Ratio: {currentImage.aspectRatio}</span>
                      <span>•</span>
                      <span>{new Date(currentImage.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={() => handleGenerate(currentImage.prompt)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Regenerate with prompt"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(currentImage.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                      title="Delete image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownload(currentImage.imageUrl, 'remly-generation')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <ImageIcon className="w-12 h-12 text-slate-700 mb-3" />
                <h3 className="text-sm font-bold text-white">Your Canvas is Ready</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Type a prompt on the left and click Generate to bring your concept to life.
                </p>
              </div>
            )}
          </div>

          {/* History Gallery */}
          {history.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Studio Generation History ({history.length})
              </h2>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentImage(item)}
                    className={`cursor-pointer rounded-2xl overflow-hidden border aspect-square bg-slate-950 relative group transition ${
                      currentImage?.id === item.id
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 text-center">
                      <p className="text-[10px] text-white line-clamp-3 font-medium">
                        {item.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={previewModalImage.imageUrl}
              alt={previewModalImage.prompt}
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs font-semibold text-white max-w-xl">
                {previewModalImage.prompt}
              </p>
              <button
                onClick={() => handleDownload(previewModalImage.imageUrl)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export High-Res</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
