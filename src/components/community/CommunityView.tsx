import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Community, CommunityMessage } from '../../types';
import {
  Users,
  MessageSquare,
  Sparkles,
  Send,
  Image as ImageIcon,
  Mic,
  Smile,
  Shield,
  Plus,
  Search,
  Lock,
  Globe,
  UserPlus,
  UserMinus,
  Settings,
  Check,
  X,
  Play,
  Pause,
  Clock,
  ChevronDown,
  AlertCircle,
  Reply,
  ArrowLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';

const POPULAR_STICKERS = [
  { id: 'stk-brain', emoji: '🧠', label: 'Big Brain' },
  { id: 'stk-grad', emoji: '🎓', label: 'Scholar' },
  { id: 'stk-rocket', emoji: '🚀', label: 'Productivity' },
  { id: 'stk-idea', emoji: '💡', label: 'Eureka!' },
  { id: 'stk-books', emoji: '📚', label: 'Study Mode' },
  { id: 'stk-trophy', emoji: '🏆', label: 'Top Scorer' },
  { id: 'stk-fire', emoji: '🔥', label: 'On Fire' },
  { id: 'stk-star', emoji: '⭐', label: 'Super Star' },
  { id: 'stk-coffee', emoji: '☕', label: 'Night Study' },
  { id: 'stk-lab', emoji: '🧪', label: 'Lab Work' },
  { id: 'stk-100', emoji: '💯', label: 'Perfection' },
  { id: 'stk-cheer', emoji: '🎉', label: 'Congrats' },
];

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '💡', '👏', '🎯'];

export const CommunityView: React.FC = () => {
  const { user, token } = useAuth();

  // State
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [publicCommunities, setPublicCommunities] = useState<
    (Community & { hasRequestedJoin: boolean })[]
  >([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'joined' | 'explore'>('joined');

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRulesDrawer, setShowRulesDrawer] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showCommunitySwitcher, setShowCommunitySwitcher] = useState(false);
  const [showReactionPickerForMsg, setShowReactionPickerForMsg] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommunityMessage | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  // Voice Note Recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Image Upload Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add Member / Admin Controls
  const [addMemberUid, setAddMemberUid] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  // New Community Form
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommIsPublic, setNewCommIsPublic] = useState(false);
  const [newCommRules, setNewCommRules] = useState<string[]>([
    'Be respectful and helpful to all peers.',
    'Share constructive feedback and study materials.',
  ]);
  const [newRuleInput, setNewRuleInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch Communities
  const fetchCommunities = async (preferredId?: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/communities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJoinedCommunities(data.joined || []);
        setPublicCommunities(data.publicCommunities || []);

        if (preferredId) {
          const found =
            data.joined.find((c: Community) => c.id === preferredId) ||
            data.publicCommunities.find((c: Community) => c.id === preferredId);
          if (found) setActiveCommunity(found);
        } else if (activeCommunity) {
          const updated = data.joined.find((c: Community) => c.id === activeCommunity.id);
          if (updated) setActiveCommunity(updated);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch communities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [token]);

  // Fetch messages when active community changes
  useEffect(() => {
    if (!activeCommunity || !token) return;

    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/communities/${activeCommunity.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.warn('Failed to fetch messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeCommunity?.id, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!user) return null;

  const isCommunityAdmin =
    activeCommunity &&
    (activeCommunity.admins.includes(user.uid) ||
      activeCommunity.createdBy === user.uid ||
      user.role === 'admin');

  const isMember =
    activeCommunity &&
    (activeCommunity.members.includes(user.uid) ||
      activeCommunity.isOfficial ||
      user.role === 'admin');

  // Send Message Handler
  const handleSendMessage = async (options?: {
    type?: 'text' | 'image' | 'voice' | 'sticker';
    mediaUrl?: string;
    audioDuration?: number;
    stickerId?: string;
  }) => {
    if (!activeCommunity || !token) return;
    const type = options?.type || (previewImage ? 'image' : 'text');
    const mediaUrl = options?.mediaUrl || previewImage || undefined;
    const stickerId = options?.stickerId || undefined;
    const audioDuration = options?.audioDuration;
    const textToSend = inputText.trim();

    if (!textToSend && !mediaUrl && !stickerId) return;

    setInputText('');
    setPreviewImage(null);
    setShowStickerPicker(false);
    const replyContext = replyTarget;
    setReplyTarget(null);

    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: textToSend,
          type,
          mediaUrl,
          audioDuration,
          stickerId,
          replyTo: replyContext
            ? {
                messageId: replyContext.id,
                senderName: replyContext.senderName,
                content: replyContext.content || (replyContext.type === 'voice' ? 'Voice Note' : 'Media'),
              }
            : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.userMessage]);
        if (data.aiMessage) {
          setTimeout(() => {
            setMessages((prev) => [...prev, data.aiMessage]);
          }, 600);
        }
      }
    } catch (err) {
      console.warn('Send message error:', err);
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeCommunity || !token) return;
    try {
      const res = await fetch(
        `/api/communities/${activeCommunity.id}/messages/${messageId}/react`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ emoji }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (err) {
      console.warn('Reaction error:', err);
    } finally {
      setShowReactionPickerForMsg(null);
    }
  };

  // Image Upload
  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Voice Note Recording (Microphone)
  const startVoiceRecording = async () => {
    setMicNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSendMessage({
            type: 'voice',
            mediaUrl: base64Audio,
            audioDuration: recordingSeconds || 1,
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setMicNotice('Microphone access denied or unavailable: ' + (err.message || 'Please check browser permissions.'));
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Audio Playback
  const toggleAudioPlayback = (audioUrl: string, msgId: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
      audioPlayerRef.current = audio;
      audio.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(msgId);
    }
  };

  // Create Community Submit
  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCommName,
          description: newCommDesc,
          isPublic: newCommIsPublic,
          rules: newCommRules,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewCommName('');
        setNewCommDesc('');
        setNewCommIsPublic(false);
        await fetchCommunities(data.community.id);
      }
    } catch (err) {
      console.warn('Create community error:', err);
    }
  };

  // Add Member By UID
  const handleAddMemberByUid = async () => {
    if (!activeCommunity || !addMemberUid.trim()) return;
    setAdminActionStatus(null);
    setAdminActionError(null);

    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: addMemberUid.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setAdminActionStatus(`User ${addMemberUid.trim()} added to community!`);
        setAddMemberUid('');
        setActiveCommunity(data.community);
        fetchCommunities(activeCommunity.id);
      } else {
        setAdminActionError(data.error || 'Failed to add member');
      }
    } catch (err: any) {
      setAdminActionError(err.message || 'Error adding member');
    }
  };

  // Remove Member
  const handleRemoveMember = async (targetUid: string) => {
    if (!activeCommunity) return;
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/members/${targetUid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCommunity(data.community);
        fetchCommunities(activeCommunity.id);
      }
    } catch (err) {
      console.warn('Remove member error:', err);
    }
  };

  // Review Join Request
  const handleReviewJoinRequest = async (requesterUid: string, decision: 'approved' | 'rejected') => {
    if (!activeCommunity) return;
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/join-requests/${requesterUid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCommunity(data.community);
        fetchCommunities(activeCommunity.id);
      }
    } catch (err) {
      console.warn('Review join request error:', err);
    }
  };

  // Request to Join Public Community
  const handleRequestJoin = async (communityId: string) => {
    try {
      const res = await fetch(`/api/communities/${communityId}/request-join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCommunities();
      }
    } catch (err) {
      console.warn('Request join error:', err);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async () => {
    if (!activeCommunity) return;
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: !activeCommunity.isPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCommunity(data.community);
        fetchCommunities(activeCommunity.id);
      }
    } catch (err) {
      console.warn('Toggle visibility error:', err);
    }
  };

  const filteredJoined = joinedCommunities.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const filteredPublic = publicCommunities.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Total members calculation for stats
  const totalGlobalMembers = joinedCommunities.reduce((acc, c) => acc + (c.members?.length || 0), 1250);

  return (
    <div className="w-full h-full">
      {/* Microphone Error Notice Banner */}
      {micNotice && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{micNotice}</span>
          </div>
          <button
            onClick={() => setMicNotice(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: WHATSAPP-STYLE GROUPS DIRECTORY
          Only visible when no community chat is currently active
         ========================================================================= */}
      {!activeCommunity ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* WhatsApp-Style Groups Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 dark:text-white tracking-tight">
                    Remly Communities
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    WhatsApp-style peer groups & study circles • Tap any group to open chat
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              id="btn-create-community-hub"
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Community</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search WhatsApp groups or topics..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-sm"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setActiveTab('joined')}
                id="tab-my-communities"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'joined'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>My Groups ({joinedCommunities.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                id="tab-explore-communities"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'explore'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Explore ({publicCommunities.length})</span>
              </button>
            </div>
          </div>

          {/* Groups List (WhatsApp Chat List Style) */}
          {activeTab === 'joined' ? (
            filteredJoined.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <Users className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Communities Joined Yet</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Join the official Remly Global Community or create your own private group.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('explore')}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Explore Public Groups
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
                  >
                    Create a Community
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJoined.map((comm) => {
                  const isAdmin =
                    comm.admins?.includes(user.uid) ||
                    comm.createdBy === user.uid ||
                    user.role === 'admin';

                  return (
                    <div
                      key={comm.id}
                      onClick={() => setActiveCommunity(comm)}
                      className={`group p-4 sm:p-5 rounded-2xl transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 border ${
                        comm.isOfficial
                          ? 'bg-white dark:bg-slate-900 border-sky-300 dark:border-sky-500/40 shadow-sm hover:shadow-md hover:border-sky-500 hover:bg-sky-50/20 dark:hover:bg-sky-950/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div
                            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-md ${
                              comm.isOfficial
                                ? 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sky-500/25'
                                : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-600/20'
                            }`}
                          >
                            {comm.isOfficial ? <Sparkles className="w-7 h-7" /> : comm.name[0]}
                          </div>
                          {/* Live Online Badge */}
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate">
                              {comm.name}
                            </h3>
                            {comm.isOfficial ? (
                              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                Official
                              </span>
                            ) : comm.isPublic ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" /> Public
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            )}
                            {isAdmin && !comm.isOfficial && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                                Admin
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                            {comm.isOfficial
                              ? '✨ Remly AI Tutor online • Ask questions, share assignments & voice notes 24/7'
                              : comm.description || 'WhatsApp-style group for peer study sessions and collaboration.'}
                          </p>

                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {comm.members.length} members
                            </span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active now
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Enter Chat Action */}
                      <div className="shrink-0 flex items-center gap-2">
                        <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition">
                          <span>Open Chat</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="sm:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Explore Public Communities */
            filteredPublic.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <Globe className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Public Communities Found</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Be the first to create a public community or invite friends via UID to your private group!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Create Public Community
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPublic.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        {comm.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {comm.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {comm.description || 'Public study & creator group on Remly.'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{comm.members.length} members</span>
                          <span>•</span>
                          <span>Created by {comm.creatorName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {comm.hasRequestedJoin ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRequestJoin(comm.id)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Join</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: FULL WHATSAPP CHAT DASHBOARD
            Only visible when a community is actively selected.
            The community directory above is 100% hidden.
           ========================================================================= */
        <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 h-[calc(100vh-5rem)]">
          <div className="h-full flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* WhatsApp Chat Dashboard Header */}
            <div className="p-3.5 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                {/* Back to Communities Hub Button (WhatsApp Style) */}
                <button
                  onClick={() => setActiveCommunity(null)}
                  id="btn-back-to-communities"
                  title="Back to all groups"
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">All Groups</span>
                </button>

                {/* Community Avatar & Info */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
                    activeCommunity.isOfficial
                      ? 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sky-500/20'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {activeCommunity.isOfficial ? <Sparkles className="w-5 h-5" /> : activeCommunity.name[0]}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {activeCommunity.name}
                    </h2>
                    {activeCommunity.isOfficial ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                        Official
                      </span>
                    ) : activeCommunity.isPublic ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>
                      {activeCommunity.isOfficial
                        ? 'Remly AI Tutor Active • Tag @remly anytime'
                        : `${activeCommunity.members.length} members • Admin: ${activeCommunity.creatorName}`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Quick Community Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowCommunitySwitcher(!showCommunitySwitcher)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                    title="Switch Group"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden md:inline">Switch</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {showCommunitySwitcher && (
                    <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-40 space-y-1">
                      <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        My Joined Groups
                      </p>
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {joinedCommunities.map((comm) => (
                          <button
                            key={comm.id}
                            onClick={() => {
                              setActiveCommunity(comm);
                              setShowCommunitySwitcher(false);
                            }}
                            className={`w-full p-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition ${
                              comm.id === activeCommunity.id
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{comm.name}</span>
                            {comm.id === activeCommunity.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rules Button */}
                <button
                  onClick={() => setShowRulesDrawer(!showRulesDrawer)}
                  className={`p-2 rounded-xl border transition shadow-sm ${
                    showRulesDrawer
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Group Guidelines & Rules"
                >
                  <Shield className="w-4 h-4 text-emerald-500" />
                </button>

                {/* Admin Tools Button */}
                {isCommunityAdmin && (
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 shadow-sm relative"
                  >
                    <Settings className="w-3.5 h-3.5 text-sky-400 dark:text-sky-600" />
                    <span className="hidden sm:inline">Admin</span>
                    {activeCommunity.joinRequests?.filter((r) => r.status === 'pending').length > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Rules Dropdown Banner */}
            {showRulesDrawer && (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Community Guidelines & Rules</span>
                </div>
                <button
                  onClick={() => setShowRulesDrawer(false)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-1.5 text-[11px]">
                {activeCommunity.rules?.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-1 text-[10px] text-emerald-700 dark:text-emerald-400/80">
                Tip: Type <code className="px-1 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 font-mono font-bold">@remly</code> in any message to get instant AI study help or homework breakdown.
              </div>
            </div>
          )}

          {/* Messages Feed Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/40 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
            {messagesLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Welcome to {activeCommunity.name}!</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                  Be the first to say hello, record a voice note, share assignment photos, or tag <span className="text-sky-500 font-bold">@remly</span> for AI study help.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                const isAi = msg.senderRole === 'ai';
                const isSystem = msg.type === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 group relative ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* User Avatar */}
                    <div
                      className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center font-bold text-xs shadow-md ${
                        isAi
                          ? 'bg-gradient-to-tr from-sky-500 via-indigo-600 to-fuchsia-600 text-white'
                          : msg.senderRole === 'admin'
                          ? 'bg-amber-600 text-white'
                          : msg.senderRole === 'creator'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isAi ? <Sparkles className="w-4 h-4" /> : msg.senderName[0]}
                    </div>

                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] space-y-1 ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender Info Line */}
                      <div
                        className={`flex items-center gap-1.5 text-[11px] ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isAi
                              ? 'text-sky-600 dark:text-sky-300 font-mono'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {msg.senderName}
                        </span>
                        {msg.senderRole && (
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                              isAi
                                ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                                : msg.senderRole === 'admin'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                : msg.senderRole === 'creator'
                                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {msg.senderRole}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Quoted Reply Preview */}
                      {msg.replyTo && (
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border-l-2 border-emerald-500 text-[10px] text-slate-600 dark:text-slate-400 mb-1 max-w-md truncate">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {msg.replyTo.senderName}:
                          </span>{' '}
                          {msg.replyTo.content}
                        </div>
                      )}

                      {/* Message Body Bubble */}
                      <div
                        className={`p-3.5 rounded-3xl text-xs leading-relaxed break-words shadow-sm ${
                          isAi
                            ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 text-slate-900 dark:text-slate-100'
                            : msg.senderRole === 'admin'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-slate-900 dark:text-slate-100'
                            : isMe
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        {/* Text Message */}
                        {msg.content && (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {/* Image Attachment with Lightbox trigger */}
                        {msg.mediaUrl && msg.type === 'image' && (
                          <div className="mt-2 rounded-2xl overflow-hidden max-w-sm border border-slate-200 dark:border-slate-700">
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => setLightboxImage(msg.mediaUrl!)}
                            />
                          </div>
                        )}

                        {/* Voice Note Player */}
                        {msg.mediaUrl && msg.type === 'voice' && (
                          <div
                            className={`mt-1.5 flex items-center gap-3 p-2.5 rounded-2xl border min-w-[210px] ${
                              isMe
                                ? 'bg-emerald-700/60 border-emerald-500/40 text-white'
                                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                            }`}
                          >
                            <button
                              onClick={() => toggleAudioPlayback(msg.mediaUrl!, msg.id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition shrink-0 ${
                                playingAudioId === msg.id
                                  ? 'bg-emerald-500 text-white animate-pulse'
                                  : isMe
                                  ? 'bg-white/20 text-white hover:bg-white/30'
                                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30'
                              }`}
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-1 h-3">
                                {[40, 70, 30, 90, 60, 45, 80, 50, 65, 35, 75, 45].map((h, i) => (
                                  <span
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full transition-all ${
                                      playingAudioId === msg.id
                                        ? 'bg-emerald-400'
                                        : isMe
                                        ? 'bg-white/60'
                                        : 'bg-slate-400 dark:bg-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div
                                className={`flex justify-between items-center text-[10px] mt-1 font-mono ${
                                  isMe ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <span>Voice Note</span>
                                <span>{msg.audioDuration ? `${msg.audioDuration}s` : 'Audio'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sticker */}
                        {msg.stickerId && (
                          <div className="text-4xl my-1 p-2 bg-slate-100 dark:bg-slate-900/60 rounded-2xl inline-block">
                            {POPULAR_STICKERS.find((s) => s.id === msg.stickerId)?.emoji || '🎓'}
                          </div>
                        )}
                      </div>

                      {/* Reactions & Hover Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* Reaction Badges */}
                        {Object.entries(msg.reactions || {}).map(([emoji, uidsVal]) => {
                          const uids = Array.isArray(uidsVal) ? (uidsVal as string[]) : [];
                          if (uids.length === 0) return null;
                          const userReacted = uids.includes(user.uid);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition ${
                                userReacted
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{uids.length}</span>
                            </button>
                          );
                        })}

                        {/* Add Reaction Button */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowReactionPickerForMsg(
                                showReactionPickerForMsg === msg.id ? null : msg.id
                              )
                            }
                            className="opacity-0 group-hover:opacity-100 transition px-1.5 py-0.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] flex items-center gap-1"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>

                          {/* Reaction Picker Popover */}
                          {showReactionPickerForMsg === msg.id && (
                            <div className="absolute bottom-full left-0 mb-1 z-30 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl flex items-center gap-1 backdrop-blur-md">
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reply Button */}
                        <button
                          onClick={() => setReplyTarget(msg)}
                          className="opacity-0 group-hover:opacity-100 transition text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 px-1.5 py-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-1"
                        >
                          <Reply className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Active Reply Banner */}
          {replyTarget && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">
                  Replying to <b className="text-slate-900 dark:text-white">{replyTarget.senderName}</b>:{' '}
                  <span className="text-slate-500 dark:text-slate-400">{replyTarget.content}</span>
                </span>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Image Attachment Preview Banner */}
          {previewImage && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Image attached</span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Voice Note Recording Pulse Bar */}
          {isRecordingVoice && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-500/30 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  Recording Voice Note ({recordingSeconds}s)... Speak clearly into microphone
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelVoiceRecording}
                  className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={stopVoiceRecording}
                  className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20"
                >
                  Finish & Send
                </button>
              </div>
            </div>
          )}

          {/* Stickers Drawer */}
          {showStickerPicker && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Academic & Learning Stickers
                </span>
                <button
                  onClick={() => setShowStickerPicker(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {POPULAR_STICKERS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSendMessage({ type: 'sticker', stickerId: s.id })}
                    className="p-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-2xl flex flex-col items-center justify-center transition hover:scale-110 shadow-sm"
                    title={s.label}
                  >
                    <span>{s.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Dock */}
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 flex items-center gap-2">
            {/* Quick Tag AI Button */}
            <button
              onClick={() => {
                if (!inputText.includes('@remly')) {
                  setInputText((prev) => `@remly ${prev}`.trim());
                }
              }}
              title="Tag Remly AI Tutor"
              className="px-2.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-500/30 text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">@remly</span>
            </button>

            {/* Hidden File Input for Images */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelected}
              accept="image/*"
              className="hidden"
            />

            {/* Image Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach Assignment Image"
              disabled={!isMember}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shrink-0 disabled:opacity-40"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
            </button>

            {/* Sticker Drawer Button */}
            <button
              onClick={() => setShowStickerPicker(!showStickerPicker)}
              title="Pick Sticker"
              disabled={!isMember}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shrink-0 disabled:opacity-40"
            >
              <Smile className="w-4 h-4 text-amber-500" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isMember
                  ? `Message ${activeCommunity.name} (tag @remly for AI help)...`
                  : 'Join community to send messages'
              }
              disabled={!isMember || isRecordingVoice}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />

            {/* Voice Note Button */}
            <button
              onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
              title={isRecordingVoice ? 'Stop Recording' : 'Record Voice Note'}
              disabled={!isMember}
              className={`p-2.5 rounded-xl border transition shrink-0 ${
                isRecordingVoice
                  ? 'bg-red-500 text-white border-red-400 animate-pulse'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
              } disabled:opacity-50`}
            >
              <Mic className="w-4 h-4 text-rose-500" />
            </button>

            {/* Send Message Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!isMember || (!inputText.trim() && !previewImage)}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )}

      {/* =========================================================================
          IMAGE LIGHTBOX MODAL (SAFE IN IFRAME)
         ========================================================================= */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE COMMUNITY MODAL
         ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Community</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">You will be the primary administrator.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Community Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  placeholder="e.g. Stanford CS Prep & Study Circle"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  placeholder="What is this community about? Share learning goals or peer focus."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Visibility Switch */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {newCommIsPublic ? (
                      <Globe className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {newCommIsPublic ? 'Public Community' : 'Private Community (Default)'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {newCommIsPublic
                          ? 'Visible in public directory. Anyone can discover and request to join.'
                          : 'Hidden from public search. Only visible to members added by Remly UID.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewCommIsPublic(!newCommIsPublic)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      newCommIsPublic ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        newCommIsPublic ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Community Rules */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Community Rules
                </label>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {newCommRules.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="truncate">
                        {i + 1}. {r}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewCommRules(newCommRules.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-500 ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    placeholder="Add a custom rule..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRuleInput.trim()) {
                        setNewCommRules([...newCommRules, newRuleInput.trim()]);
                        setNewRuleInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/25"
                >
                  Create Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADMIN TOOLS & MEMBERS MANAGEMENT MODAL
         ========================================================================= */}
      {showAdminModal && activeCommunity && isCommunityAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Shield className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeCommunity.name} — Admin Controls
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add members by UID, review join requests, and toggle privacy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 pr-1">
              {/* Privacy Setting Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {activeCommunity.isPublic ? (
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    Visibility: {activeCommunity.isPublic ? 'Public' : 'Private (Hidden)'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeCommunity.isPublic
                      ? 'Anyone can discover this community and request to join.'
                      : 'Only users added via UID can see or access this community.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleVisibility}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition"
                >
                  Make {activeCommunity.isPublic ? 'Private' : 'Public'}
                </button>
              </div>

              {/* Add Member by UID Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Add Member by UID</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addMemberUid}
                    onChange={(e) => setAddMemberUid(e.target.value)}
                    placeholder="Enter Remly UID (e.g. RML-A9B8C7D6)"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleAddMemberByUid}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20"
                  >
                    Add Member
                  </button>
                </div>
                {adminActionStatus && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {adminActionStatus}
                  </p>
                )}
                {adminActionError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {adminActionError}
                  </p>
                )}
              </div>

              {/* Join Requests (for Public Communities) */}
              {activeCommunity.joinRequests && activeCommunity.joinRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Pending Join Requests (
                      {activeCommunity.joinRequests.filter((r) => r.status === 'pending').length})
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {activeCommunity.joinRequests
                      .filter((r) => r.status === 'pending')
                      .map((req) => (
                        <div
                          key={req.uid}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{req.fullName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              UID: {req.uid} • Role: {req.role}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReviewJoinRequest(req.uid, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewJoinRequest(req.uid, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Current Members List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-500" />
                  <span>Current Members ({activeCommunity.members.length})</span>
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {activeCommunity.members.map((memberUid) => {
                    const isCreator = memberUid === activeCommunity.createdBy;
                    const isAdmin = activeCommunity.admins.includes(memberUid);
                    return (
                      <div
                        key={memberUid}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-700 dark:text-slate-300">{memberUid}</span>
                          {isCreator && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                              Creator
                            </span>
                          )}
                          {!isCreator && isAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300">
                              Admin
                            </span>
                          )}
                        </div>
                        {!isCreator && (
                          <button
                            onClick={() => handleRemoveMember(memberUid)}
                            title="Remove member"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-900 transition"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
