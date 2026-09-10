import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import { NotificationItem } from '../../types';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  Download,
  GraduationCap,
  Palette,
  ShieldCheck,
  User as UserIcon,
  X,
  Check,
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth?: (initialMode?: 'login' | 'register', role?: 'student' | 'creator') => void;
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onNavigate, currentView }) => {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fetch notifications if logged in
  useEffect(() => {
    if (!token) return;
    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((data) => setNotifications(data.notifications || []))
      .catch((err) => console.warn('Notifications fetch error:', err));
  }, [token]);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const markNotificationRead = async (id: string) => {
    if (!token) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/85 dark:bg-slate-950/85 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate && onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group"
          id="nav-brand-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-wider text-white font-heading">
              {REMLY_CONFIG.appName}
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
              AI Platform
            </span>
          </div>
        </div>

        {/* Center Navigation for Authenticated Users */}
        {user && onNavigate && (
          <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {user.role === 'student' && (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'dashboard' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate('tutor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'tutor' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {REMLY_CONFIG.aiTutorName}
                </button>
                <button
                  onClick={() => onNavigate('classes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'classes' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Classes
                </button>
                <button
                  onClick={() => onNavigate('exams')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'exams' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Exams
                </button>
                <button
                  onClick={() => onNavigate('profile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'profile' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  XP & Profile
                </button>
              </>
            )}

            {user.role === 'creator' && (
              <>
                <button
                  onClick={() => onNavigate('creator-dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'creator-dashboard' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Creator Dashboard
                </button>
                <button
                  onClick={() => onNavigate('creator-generator')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'creator-generator' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  AI Image Studio
                </button>
                <button
                  onClick={() => onNavigate('creator-projects')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentView === 'creator-projects' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Projects & Tools
                </button>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => onNavigate('admin-dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'admin-dashboard' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Console
                </button>
              </>
            )}
          </div>
        )}

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          {/* PWA Install Button */}
          {installPrompt && (
            <button
              onClick={handleInstallPWA}
              id="btn-install-pwa"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium border border-sky-500/30 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            id="btn-theme-toggle"
            aria-label="Toggle Theme"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              {/* Notifications Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  id="btn-notifications"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-slate-950 animate-pulse" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 mt-2">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`py-3 flex items-start justify-between gap-3 text-xs ${
                              notif.read ? 'opacity-60' : 'opacity-100 font-medium'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-slate-200 font-semibold">{notif.title}</p>
                              <p className="text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!notif.read && (
                              <button
                                onClick={() => markNotificationRead(notif.id)}
                                title="Mark as read"
                                className="text-slate-500 hover:text-sky-400 p-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  id="btn-user-profile-menu"
                  className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-white leading-none">{user.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.uid}</p>
                  </div>
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-lg bg-slate-800 object-cover"
                  />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-3">
                    <div className="p-2 border-b border-slate-800 mb-2">
                      <p className="text-xs font-bold text-white">{user.fullName}</p>
                      <p className="text-xs text-slate-400">@{user.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                          {user.uid}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium capitalize">
                          {user.role}
                        </span>
                      </div>
                      {user.role === 'student' && (
                        <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                          <span>Level {user.level || 1}</span>
                          <span className="text-sky-400 font-semibold">{user.xp || 0} XP</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onNavigate && onNavigate(user.role === 'student' ? 'profile' : 'creator-dashboard');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Account Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                        if (onNavigate) onNavigate('home');
                      }}
                      id="btn-logout"
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth && onOpenAuth('login')}
                id="btn-nav-login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth('register')}
                id="btn-nav-get-started"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 transition transform active:scale-95"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
