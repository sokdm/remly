import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import {
  User as UserIcon,
  Award,
  Globe,
  Flame,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export const ProfileProgressView: React.FC = () => {
  const { user, token, updateUser, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [country, setCountry] = useState(user?.country || 'United States');
  const [countryCode, setCountryCode] = useState(user?.countryCode || 'US');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.username || 'remly');

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const currentXp = user.xp || 0;
  const currentLevel = user.level || 1;
  const nextLevelXp = REMLY_CONFIG.calculateXpForNextLevel(currentLevel);
  const currentBaseXp = REMLY_CONFIG.levelMilestones[currentLevel - 1] || 0;
  const levelProgress = Math.min(
    100,
    Math.round(((currentXp - currentBaseXp) / (nextLevelXp - currentBaseXp)) * 100)
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          username,
          country,
          countryCode,
          bio,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${avatarSeed}`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        updateUser(data.user);
        refreshProfile();
      } else {
        showToast(data.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      showToast('Network error while saving profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredCountries = REMLY_CONFIG.countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Account Profile & XP</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your verified credentials, avatar, and view academic progression records.
        </p>
      </div>

      {/* Level and Progression Overview */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xl border border-sky-500/30">
              L{currentLevel}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Academic Tier: Level {currentLevel}
              </h2>
              <p className="text-xs text-slate-400">
                Total XP Earned: <strong className="text-sky-400 font-semibold">{currentXp} XP</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              <span>{user.learningStreak || 1} Day Streak</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Progress to Level {currentLevel + 1}</span>
            <span>{levelProgress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <h2 className="text-base font-bold text-white font-heading mb-4">Edit Profile Info</h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Immutable UID Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Remly Student UID (Permanent)
              </span>
              <p className="text-base font-bold text-sky-400 font-mono tracking-wider mt-0.5">
                {user.uid}
              </p>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Immutable</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Country Selector */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
              <button
                type="button"
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span>{REMLY_CONFIG.countries.find((c) => c.name === country)?.flag || '🌐'}</span>
                  <span>{country}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showCountryPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 bg-slate-950 border border-slate-800 rounded-xl shadow-xl z-50 p-2 overflow-y-auto">
                  <input
                    type="text"
                    placeholder="Filter country..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white mb-1"
                  />
                  {filteredCountries.map((c) => (
                    <div
                      key={c.code}
                      onClick={() => {
                        setCountry(c.name);
                        setCountryCode(c.code);
                        setShowCountryPicker(false);
                      }}
                      className="px-2 py-1.5 hover:bg-slate-900 rounded cursor-pointer text-xs flex items-center gap-2 text-slate-200"
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar Seed */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Avatar Custom Seed
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
                />
                <img
                  src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${avatarSeed}`}
                  alt="Avatar Preview"
                  className="w-9 h-9 rounded-xl bg-slate-800 object-cover border border-slate-700 shrink-0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your tutors and peers about your academic interests..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-md shadow-sky-500/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
