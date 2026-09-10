import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import { cleanAISymbols, cleanForSpeech } from '../../utils/cleanText';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  RefreshCw,
  Send,
  AlertCircle,
  Play,
} from 'lucide-react';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewMessageLogged: (message: { sender: 'student' | 'tutor'; text: string }) => void;
  conversationId: string;
}

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  onNewMessageLogged,
  conversationId,
}) => {
  const { user, token } = useAuth();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiSpokenText, setAiSpokenText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHandsFree, setIsHandsFree] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<'female' | 'male'>('female');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0-100% vocal volume
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Context & Metering
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize and clean up Web Audio + Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      stopAllVoiceActivity();
      return;
    }

    // Preload available SpeechSynthesis voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Setup speech recognition
    setupSpeechRecognition();

    // Start listening on modal open
    const timer = setTimeout(() => {
      startListening();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopAllVoiceActivity();
    };
  }, [isOpen]);

  const setupSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not natively supported in this browser. Please use Chrome, Safari, or Edge, or type your message below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setVoiceState('listening');
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSaid = final || interim;
        if (currentSaid) {
          setTranscript(currentSaid);

          // If hands-free, set silence timer to auto-send after 1.8s of silence
          if (isHandsFree) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (currentSaid.trim().length > 1 && !isSpeakingRef.current) {
                handleSendVoiceMessage(currentSaid.trim());
              }
            }, 1800);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          return;
        }
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        }
      };

      recognition.onend = () => {
        if (voiceState === 'listening' && !isSpeakingRef.current && isOpen) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
    } catch (err: any) {
      console.warn('Speech recognition init error:', err);
    }
  };

  const setupAudioMetering = async () => {
    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      }

      // Loop to update audio level for visual feedback
      const sample = () => {
        if (analyserRef.current && voiceState === 'listening') {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        } else {
          setAudioLevel(0);
        }
        animationFrameRef.current = requestAnimationFrame(sample);
      };

      sample();
    } catch (err: any) {
      console.warn('Audio metering permission notice:', err.message);
    }
  };

  const stopAllVoiceActivity = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    isSpeakingRef.current = false;
    setVoiceState('idle');
    setAudioLevel(0);
  };

  const startListening = async () => {
    stopAudio();
    setErrorMessage(null);

    // Prompt mic permission explicitly
    try {
      await setupAudioMetering();
    } catch {}

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setVoiceState('listening');
      } catch {
        // already running
        setVoiceState('listening');
      }
    } else {
      setupSpeechRecognition();
      try {
        recognitionRef.current?.start();
        setVoiceState('listening');
      } catch {}
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setVoiceState('idle');
    setAudioLevel(0);
  };

  const toggleMic = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'speaking') {
      stopAudio();
      startListening();
    } else {
      startListening();
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
  };

  const handleSendVoiceMessage = async (textToSend: string) => {
    if (!textToSend || !textToSend.trim()) return;

    // Stop recognition while thinking
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setVoiceState('thinking');
    onNewMessageLogged({ sender: 'student', text: textToSend });
    setTranscript('');
    setManualText('');

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
        }),
      });

      if (!response.ok) {
        throw new Error('Tutor server error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullTutorResponse = '';

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const rawChunk = decoder.decode(value);
          const lines = rawChunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.chunk) {
                  fullTutorResponse += parsed.chunk;
                }
                if (parsed.done && parsed.fullText) {
                  fullTutorResponse = parsed.fullText;
                }
              } catch {}
            }
          }
        }
      }

      const cleanText = cleanAISymbols(fullTutorResponse);
      setAiSpokenText(cleanText);
      onNewMessageLogged({ sender: 'tutor', text: cleanText });

      // Speak response back to the user
      await speakResponse(cleanText);
    } catch (err: any) {
      console.error('Voice message error:', err);
      setErrorMessage('Failed to receive voice response: ' + err.message);
      setVoiceState('idle');
    }
  };

  const speakResponse = async (textToSpeak: string) => {
    if (isMuted) {
      setVoiceState('idle');
      if (isHandsFree) startListening();
      return;
    }

    setVoiceState('speaking');
    isSpeakingRef.current = true;
    const speechScript = cleanForSpeech(textToSpeak);

    // Try server-side natural TTS first
    try {
      const res = await fetch('/api/tutor/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: speechScript.slice(0, 800),
          gender: selectedVoice,
        }),
      });

      const data = await res.json();

      if (data.audioUrl) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src = data.audioUrl;
        audioPlayerRef.current.onended = () => {
          isSpeakingRef.current = false;
          setVoiceState('idle');
          if (isHandsFree && isOpen) {
            setTimeout(() => startListening(), 400);
          }
        };
        audioPlayerRef.current.onerror = () => {
          playBrowserTtsFallback(speechScript);
        };
        await audioPlayerRef.current.play();
        return;
      }
    } catch (e) {
      console.warn('ElevenLabs TTS unavailable, falling back to Browser TTS:', e);
    }

    // Fallback: Browser Web Speech API SpeechSynthesis
    playBrowserTtsFallback(speechScript);
  };

  const playBrowserTtsFallback = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setVoiceState('idle');
      if (isHandsFree) startListening();
      return;
    }

    // Resume speech synthesis to prevent Chrome background pause
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = selectedVoice === 'female' ? 1.05 : 0.95;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (selectedVoice === 'female'
          ? v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha')
          : v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel'))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setVoiceState('idle');
      if (isHandsFree && isOpen) {
        setTimeout(() => startListening(), 400);
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setVoiceState('idle');
      if (isHandsFree && isOpen) startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl transition-all">
      <div className="relative w-full max-w-2xl h-full sm:h-[680px] flex flex-col justify-between p-6 sm:p-8 select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {REMLY_CONFIG.aiTutorName} Voice Mode
              </h2>
              <span className="text-[11px] text-sky-400 font-medium">
                {voiceState === 'listening' && (
                  audioLevel > 10 ? 'Hearing your voice...' : 'Listening to you...'
                )}
                {voiceState === 'thinking' && 'Remly is thinking...'}
                {voiceState === 'speaking' && 'Remly is speaking...'}
                {voiceState === 'idle' && 'Tap mic orb to speak'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Gender Selection */}
            <button
              onClick={() => setSelectedVoice((v) => (v === 'female' ? 'male' : 'female'))}
              title={`Voice: ${selectedVoice}`}
              className="px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
            >
              {selectedVoice === 'female' ? 'Voice: Female' : 'Voice: Male'}
            </button>

            {/* Mute toggle */}
            <button
              onClick={() => {
                if (!isMuted) stopAudio();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              id="btn-close-voice-modal"
              title="Close Voice Mode"
              className="p-2 rounded-full bg-slate-800/80 hover:bg-rose-500 hover:text-white text-slate-300 border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Dynamic Voice Visualizer Orb */}
        <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
          <div className="relative flex items-center justify-center">
            {/* Voice Active Dynamic Audio Waves */}
            {voiceState === 'listening' && (
              <>
                <div
                  style={{ transform: `scale(${1 + audioLevel / 70})` }}
                  className="absolute w-56 h-56 rounded-full bg-sky-500/15 transition-transform duration-100 ease-out"
                />
                <div
                  style={{ transform: `scale(${1 + audioLevel / 120})` }}
                  className="absolute w-44 h-44 rounded-full bg-cyan-500/25 transition-transform duration-75 ease-out"
                />
              </>
            )}

            {voiceState === 'speaking' && (
              <>
                <div className="absolute w-64 h-64 rounded-full bg-indigo-500/20 animate-pulse duration-700" />
                <div className="absolute w-52 h-52 rounded-full bg-sky-500/30 animate-ping duration-1000" />
              </>
            )}

            {voiceState === 'thinking' && (
              <div className="absolute w-56 h-56 rounded-full border-2 border-dashed border-sky-400/50 animate-spin duration-3000" />
            )}

            {/* The Central Interactive Orb */}
            <button
              onClick={toggleMic}
              id="voice-central-orb"
              className={`
                relative z-20 w-36 h-36 sm:w-44 sm:h-44 rounded-full
                flex flex-col items-center justify-center
                shadow-2xl transition-all duration-300 cursor-pointer
                ${
                  voiceState === 'listening'
                    ? 'bg-gradient-to-tr from-sky-500 via-cyan-400 to-sky-600 shadow-sky-500/50 scale-105 ring-8 ring-sky-500/30'
                    : voiceState === 'thinking'
                    ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-600 shadow-indigo-500/50 animate-pulse ring-4 ring-indigo-500/30'
                    : voiceState === 'speaking'
                    ? 'bg-gradient-to-tr from-indigo-500 via-sky-500 to-indigo-700 shadow-indigo-500/50 scale-105 ring-8 ring-indigo-500/30'
                    : 'bg-gradient-to-tr from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600'
                }
              `}
            >
              {voiceState === 'listening' && (
                <div className="flex flex-col items-center">
                  <Mic className="w-10 h-10 text-white animate-bounce" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider mt-1">
                    {audioLevel > 10 ? 'Hearing You' : 'Listening'}
                  </span>
                </div>
              )}

              {voiceState === 'thinking' && (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-9 h-9 text-white animate-spin" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider mt-1">
                    Thinking
                  </span>
                </div>
              )}

              {voiceState === 'speaking' && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 h-8">
                    <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                    <span className="w-1.5 h-9 bg-white rounded-full animate-bounce" />
                    <span className="w-1.5 h-4 bg-white rounded-full animate-pulse" />
                    <span className="w-1.5 h-8 bg-white rounded-full animate-bounce" />
                    <span className="w-1.5 h-5 bg-white rounded-full animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1">
                    Tap to Interrupt
                  </span>
                </div>
              )}

              {voiceState === 'idle' && (
                <div className="flex flex-col items-center text-slate-300">
                  <Mic className="w-10 h-10 mb-1" />
                  <span className="text-xs font-semibold">Tap to Speak</span>
                </div>
              )}
            </button>
          </div>

          {/* Subtitles / Real-time Transcript */}
          <div className="w-full max-w-lg mt-6 min-h-[85px] flex flex-col items-center text-center px-4">
            {transcript && (
              <div className="p-3.5 rounded-2xl bg-sky-950/60 border border-sky-500/30 text-sky-200 text-xs sm:text-sm max-w-md animate-in fade-in flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-sky-400 block mb-0.5 text-left">
                    You
                  </span>
                  "{transcript}"
                </div>
                <button
                  onClick={() => handleSendVoiceMessage(transcript)}
                  title="Send Now"
                  className="p-2 rounded-xl bg-sky-500 text-white shrink-0 hover:bg-sky-400 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!transcript && aiSpokenText && voiceState === 'speaking' && (
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs sm:text-sm max-w-md line-clamp-3">
                <span className="text-[10px] font-bold uppercase text-indigo-400 block mb-0.5 text-left">
                  Remly
                </span>
                "{aiSpokenText}"
              </div>
            )}

            {!transcript && !aiSpokenText && (
              <p className="text-xs text-slate-500 font-medium">
                {isHandsFree
                  ? 'Speak freely. Remly listens and replies automatically.'
                  : 'Tap the orb and start speaking.'}
              </p>
            )}

            {errorMessage && (
              <div className="mt-3 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Manual Input Fallback Bar inside Voice Modal */}
          <div className="w-full max-w-md mt-2 flex gap-2">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualText.trim()) {
                  handleSendVoiceMessage(manualText.trim());
                }
              }}
              placeholder="Or type what you want to say..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => {
                if (manualText.trim()) handleSendVoiceMessage(manualText.trim());
              }}
              disabled={!manualText.trim()}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Bar: Mode controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isHandsFree}
              onChange={(e) => setIsHandsFree(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                isHandsFree ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isHandsFree ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-xs text-slate-300 font-semibold">
              Hands-Free Conversation
            </span>
          </label>

          <div className="flex items-center gap-3">
            {voiceState === 'speaking' ? (
              <button
                onClick={() => {
                  stopAudio();
                  startListening();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              >
                <Square className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>Interrupt Remly</span>
              </button>
            ) : voiceState === 'listening' ? (
              <button
                onClick={stopListening}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 border border-rose-500/30"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Pause Mic</span>
              </button>
            ) : (
              <button
                onClick={startListening}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-sky-600/25"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Resume Voice</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Switch to Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
