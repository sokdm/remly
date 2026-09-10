import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import { AIMessage, AIMemory } from '../../types';
import { CleanTextRenderer } from '../common/CleanTextRenderer';
import { cleanForSpeech } from '../../utils/cleanText';
import { VoiceConversationModal } from './VoiceConversationModal';
import {
  Sparkles,
  Send,
  Image as ImageIcon,
  X,
  Volume2,
  VolumeX,
  BrainCircuit,
  Bot,
  User,
  Paperclip,
  CheckCircle,
  Calendar,
  Clock,
  RefreshCw,
  Award,
  Mic,
  Trash2,
  PhoneCall,
  RotateCcw,
} from 'lucide-react';

export const AITutorView: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const conversationStorageKey = user?.uid ? `remly_tutor_conv_${user.uid}` : 'remly_tutor_conv_guest';
  const messagesStorageKey = user?.uid ? `remly_tutor_msgs_${user.uid}` : 'remly_tutor_msgs_guest';

  // Active Conversation ID
  const [conversationId, setConversationId] = useState<string>(() => {
    try {
      return localStorage.getItem(conversationStorageKey) || `conv_${user?.uid || 'guest'}_active`;
    } catch {
      return `conv_${user?.uid || 'guest'}_active`;
    }
  });

  // Messages with initial local restoration for instant display
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const cached = localStorage.getItem(messagesStorageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
  } | null>(null);

  // Voice Settings (ElevenLabs & Web Speech)
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // ChatGPT-like Voice Conversation Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Long-Term Memory
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(messagesStorageKey, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, messagesStorageKey]);

  // Save conversationId
  useEffect(() => {
    try {
      localStorage.setItem(conversationStorageKey, conversationId);
    } catch {}
  }, [conversationId, conversationStorageKey]);

  // Load Preserved Conversation from Server on Mount
  useEffect(() => {
    if (!token) return;

    // 1. Fetch Student Memories
    fetch('/api/tutor/memory', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { memories: [] }))
      .then((data) => setMemories(data.memories || []))
      .catch((err) => console.warn('Memory fetch note:', err));

    // 2. Fetch Preserved Messages from Backend
    fetch('/api/tutor/messages', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // If server has no messages for this student, initialize with personalized greeting
          fetchInitialGreeting();
        }
      })
      .catch(() => {
        if (messages.length === 0) {
          fetchInitialGreeting();
        }
      });
  }, [token]);

  const fetchInitialGreeting = () => {
    fetch('/api/tutor/greeting', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages([
          {
            id: 'initial_greeting',
            conversationId,
            sender: 'tutor',
            text:
              data.greeting ||
              `Hello ${user?.fullName || 'there'}! I'm ${REMLY_CONFIG.aiTutorName}. What concept, assignment, or subject would you like to master today?`,
            timestamp: new Date().toISOString(),
          },
        ]);
      })
      .catch(() => {
        setMessages([
          {
            id: 'initial_greeting',
            conversationId,
            sender: 'tutor',
            text: `Hello ${user?.fullName || 'there'}! I'm ${REMLY_CONFIG.aiTutorName}. Ready to dive into your next lesson?`,
            timestamp: new Date().toISOString(),
          },
        ]);
      });
  };

  // Reset / Clear Conversation
  const handleResetConversation = async () => {
    if (!window.confirm('Are you sure you want to clear your conversation history and start fresh?')) {
      return;
    }

    try {
      if (token) {
        await fetch('/api/tutor/messages', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      try {
        localStorage.removeItem(messagesStorageKey);
      } catch {}

      const newConvId = `conv_${user?.uid || 'guest'}_${Date.now()}`;
      setConversationId(newConvId);
      setMessages([]);
      fetchInitialGreeting();
      showToast('Conversation history reset.', 'info');
    } catch (e) {
      console.warn('Failed to reset conversation', e);
    }
  };

  // Handle Image Upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', 'warning');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image size exceeds 15MB limit.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setSelectedImage({
        base64,
        mimeType: file.type,
        preview: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  // Play Speech via ElevenLabs voice service or Web Speech fallback (cleans symbols first)
  const playSpeech = async (text: string) => {
    if (!text) return;
    const cleanScript = cleanForSpeech(text);

    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      setIsPlayingAudio(true);
      const res = await fetch('/api/tutor/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: cleanScript.slice(0, 800), gender: voiceGender }),
      });

      const data = await res.json();

      if (data.isAvailable && data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        currentAudioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
      } else {
        // Fallback to browser Web Speech API
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanScript.slice(0, 400));
          utterance.rate = 1.05;
          utterance.pitch = voiceGender === 'female' ? 1.1 : 0.95;
          utterance.onend = () => setIsPlayingAudio(false);
          utterance.onerror = () => setIsPlayingAudio(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsPlayingAudio(false);
        }
      }
    } catch (err) {
      console.warn('Voice playback failed:', err);
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  // Submit Message & Stream SSE
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if ((!textToSend.trim() && !selectedImage) || isStreaming) return;

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      conversationId,
      sender: 'student',
      text: textToSend.trim(),
      imageUrl: selectedImage?.preview,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    const imagePayload = selectedImage;
    setSelectedImage(null);
    setIsStreaming(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/tutor/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend,
          conversationId,
          imageBase64: imagePayload?.base64,
          imageMimeType: imagePayload?.mimeType,
        }),
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                accumulatedText += parsed.chunk;
                setStreamingText(accumulatedText);
              }

              if (parsed.action === 'class_scheduled') {
                showToast(
                  `Scheduled: ${parsed.class.subject} (${parsed.class.days.join(', ')})`,
                  'success'
                );
              }

              if (parsed.done) {
                const finalReply = parsed.fullText || accumulatedText;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `tutor_${Date.now()}`,
                    conversationId,
                    sender: 'tutor',
                    text: finalReply,
                    timestamp: new Date().toISOString(),
                  },
                ]);
                setStreamingText('');
                setIsStreaming(false);

                // Speak response if voice is enabled
                if (voiceEnabled) {
                  playSpeech(finalReply);
                }
              }

              if (parsed.error) {
                showToast(parsed.error, 'error');
                setIsStreaming(false);
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err: any) {
      showToast('Connection error during streaming. Please retry.', 'error');
      setIsStreaming(false);
    }
  };

  // Called when messages are added inside the ChatGPT Voice Mode modal
  const handleNewVoiceMessage = (item: { sender: 'student' | 'tutor'; text: string }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `voice_${item.sender}_${Date.now()}`,
        conversationId,
        sender: item.sender,
        text: item.text,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-heading">
              {REMLY_CONFIG.aiTutorName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Conversation Preserved & Adaptive</span>
            </div>
          </div>
        </div>

        {/* Right Controls: ChatGPT Voice Launcher, Reset History, Memory */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ChatGPT Voice Mode Button */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            id="btn-launch-voice-mode"
            title="Start ChatGPT-style voice conversation"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-500/25"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Mode</span>
          </button>

          {/* Voice Audio Read Aloud Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => {
                if (isPlayingAudio) stopAudio();
                setVoiceEnabled(!voiceEnabled);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                voiceEnabled ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {voiceEnabled && (
              <>
                <select
                  value={voiceGender}
                  onChange={(e) => setVoiceGender(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-[11px] text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>

                {isPlayingAudio && (
                  <button
                    onClick={stopAudio}
                    className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/30 transition"
                  >
                    Stop
                  </button>
                )}
              </>
            )}
          </div>

          {/* Memory Drawer Toggle */}
          <button
            onClick={() => setShowMemoryDrawer(!showMemoryDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-sky-400" />
            <span>Memory ({memories.length})</span>
          </button>

          {/* New Chat / Reset History */}
          <button
            onClick={handleResetConversation}
            title="Reset conversation and start new chat"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Memory Drawer Modal */}
      {showMemoryDrawer && (
        <div className="p-4 my-2 rounded-2xl bg-slate-900 border border-sky-500/30 text-xs animate-in fade-in shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-sky-400" />
              Long-Term Student Memory Context
            </span>
            <button
              onClick={() => setShowMemoryDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 mb-3">
            {REMLY_CONFIG.aiTutorName} automatically recalls these student insights across sessions:
          </p>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {memories.length === 0 ? (
              <span className="text-slate-500 italic">
                No persistent memory records yet. Keep interacting to build your profile!
              </span>
            ) : (
              memories.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <strong className="capitalize text-sky-400">{m.category}:</strong> {m.fact}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'student' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'tutor' && (
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'student'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md'
              }`}
            >
              {msg.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src={msg.imageUrl}
                    alt="Homework attachment"
                    className="max-h-60 w-auto object-contain mx-auto"
                  />
                </div>
              )}

              {/* Clean text rendering with NO raw markdown symbols (###, **, *, ---) */}
              {msg.sender === 'tutor' ? (
                <CleanTextRenderer text={msg.text} />
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}

              {msg.sender === 'tutor' && voiceEnabled && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    onClick={() => playSpeech(msg.text)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                  >
                    <Volume2 className="w-3 h-3" />
                    Read aloud
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'student' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Live Streaming Response Bubble with Clean Text Renderer */}
        {isStreaming && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed bg-slate-900 border border-sky-500/30 text-slate-100 shadow-md">
              {streamingText ? (
                <CleanTextRenderer text={streamingText} />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  {REMLY_CONFIG.aiTutorName} is formulating explanation...
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Starter Chips (if few messages) */}
      {messages.length <= 2 && !isStreaming && (
        <div className="flex flex-wrap gap-2 pb-3 shrink-0">
          <button
            onClick={() => handleSendMessage('Can you explain Newton’s Laws with real world examples?')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition"
          >
            💡 Explain Newton's Laws
          </button>
          <button
            onClick={() => handleSendMessage('Teach me Python functions step-by-step.')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition"
          >
            🐍 Learn Python Functions
          </button>
          <button
            onClick={() =>
              handleSendMessage(
                'Schedule a Calculus class for me every Monday and Wednesday at 3:00 PM.'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition"
          >
            📅 Schedule a Routine Class
          </button>
        </div>
      )}

      {/* Image Preview Thumbnail (if selected) */}
      {selectedImage && (
        <div className="mb-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shrink-0 max-w-sm">
          <div className="flex items-center gap-2">
            <img
              src={selectedImage.preview}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-lg border border-slate-800"
            />
            <span className="text-xs text-slate-300 font-medium truncate">
              Attachment Ready
            </span>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload homework problem or diagram image"
          className="p-2.5 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Microphone Button -> Opens ChatGPT-like Voice Conversation Flow */}
        <button
          type="button"
          onClick={() => setIsVoiceModalOpen(true)}
          id="btn-mic-voice-mode"
          title="Talk with Remly (Microphone Voice Mode)"
          className="p-2.5 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition group relative"
        >
          <Mic className="w-4 h-4 group-hover:scale-110 transition-transform text-sky-400" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask ${REMLY_CONFIG.aiTutorName} anything or tap microphone to speak...`}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedImage) || isStreaming}
          className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-500/20"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* ChatGPT-like Voice Conversation Flow Modal */}
      <VoiceConversationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        conversationId={conversationId}
        onNewMessageLogged={handleNewVoiceMessage}
      />
    </div>
  );
};
