import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import { NotificationItem } from '../../types';
import {
  LayoutDashboard,
  Sparkles,
  Calendar,
  GraduationCap,
  Award,
  Palette,
  Layers,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Flame,
  PanelLeftClose,
  PanelLeft,
  Check,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Copy,
  SlidersHorizontal,
  FileCheck2,
  Users,
} from 'lucide-react';

interface DashboardLayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onViewLanding?: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentView,
  onNavigate,
  onViewLanding,
  children,
}) => {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Collapsible sidebar state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('remly_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Mobile sidebar open state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // User profile popover in top bar
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Sync collapsed state to localStorage
  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('remly_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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

  const markNotificationRead = async (id: string) => {
    if (!token) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const copyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Active view titles & labels
  const getViewMeta = (view: string) => {
    switch (view) {
      case 'dashboard':
        return { title: 'Student Dashboard', category: 'Academic Wing', icon: LayoutDashboard };
      case 'tutor':
        return { title: REMLY_CONFIG.aiTutorName, category: 'AI Learning', icon: Sparkles };
      case 'assignments':
      case 'assignment-solver':
        return { title: 'Assignment Solver', category: 'Homework & Vision AI', icon: FileCheck2 };
      case 'classes':
        return { title: 'Scheduled Classes', category: 'Study Routine', icon: Calendar };
      case 'exams':
        return { title: 'Exams & Evaluations', category: 'Assessment', icon: GraduationCap };
      case 'profile':
        return { title: 'XP & Progression', category: 'Achievements', icon: Award };
      case 'community':
        return { title: 'Remly Community Hub', category: 'Global Collaboration', icon: Users };
      case 'creator-hub':
      case 'creator-dashboard':
        return { title: 'Creator Hub', category: 'Creator Studio', icon: Layers };
      case 'creator-generator':
        return { title: 'AI Image Studio', category: 'Asset Generation', icon: Palette };
      case 'creator-projects':
        return { title: 'Creator Projects & Pipelines', category: 'Workflows', icon: Layers };
      case 'admin':
      case 'admin-dashboard':
        return { title: 'Admin Console', category: 'Platform Governance', icon: ShieldCheck };
      default:
        return { title: 'Dashboard', category: 'Platform', icon: LayoutDashboard };
    }
  };

  const currentMeta = getViewMeta(currentView);
  const CurrentIcon = currentMeta.icon;

  if (!user) return null;

  const currentXp = user.xp || 0;
  const currentLevel = user.level || 1;
  const nextLevelXp = REMLY_CONFIG.calculateXpForNextLevel(currentLevel);
  const currentBaseXp = REMLY_CONFIG.levelMilestones[currentLevel - 1] || 0;
  const levelProgress = Math.min(
    100,
    Math.round(((currentXp - currentBaseXp) / Math.max(1, nextLevelXp - currentBaseXp)) * 100)
  );

  // Student Nav items
  const studentNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'tutor',
      label: REMLY_CONFIG.aiTutorName,
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'assignments',
      label: 'Assignment Solver',
      icon: FileCheck2,
      badge: 'Vision AI',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'classes',
      label: 'Classes & Routine',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'exams',
      label: 'Exams & Tests',
      icon: GraduationCap,
      badge: user.missedExamsCount ? `${user.missedExamsCount} alert` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'profile',
      label: 'XP & Progression',
      icon: Award,
      badge: `Lvl ${currentLevel}`,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'community',
      label: 'Community Hub',
      icon: Users,
      badge: 'Global',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  // Creator Nav items
  const creatorNavItems = [
    {
      id: 'creator-hub',
      label: 'Creator Hub',
      icon: Layers,
      badge: null,
    },
    {
      id: 'creator-generator',
      label: 'AI Image Studio',
      icon: Palette,
      badge: 'PRO',
      badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    },
    {
      id: 'community',
      label: 'Community Hub',
      icon: Users,
      badge: 'Global',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  // Admin Nav item
  const adminNavItems = [
    {
      id: 'admin',
      label: 'Admin Console',
      icon: ShieldCheck,
      badge: 'System',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'community',
      label: 'Community Hub',
      icon: Users,
      badge: 'Global',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-150">
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Main Flex Wrapper: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================= */}
        {/* SIDEBAR (Responsive: Desktop Collapsible + Mobile Drawer) */}
        {/* ========================================================= */}
        <aside
          id="dashboard-collapsible-sidebar"
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            flex flex-col
            bg-white/95 dark:bg-slate-950/95 border-r border-slate-200 dark:border-slate-800/80
            backdrop-blur-xl
            transition-all duration-300 ease-in-out
            ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
            ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          `}
        >
          {/* Sidebar Top: Logo & Collapse Button */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 shrink-0">
            <div
              onClick={() => handleItemClick(user.role === 'creator' ? 'creator-hub' : 'dashboard')}
              className="flex items-center gap-3 cursor-pointer group overflow-hidden"
              title="Remly AI Platform"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col truncate">
                  <span className="text-lg font-bold tracking-wider text-slate-900 dark:text-white font-heading truncate">
                    {REMLY_CONFIG.appName}
                  </span>
                  <span className="text-[10px] text-sky-500 dark:text-sky-400 font-semibold tracking-wide uppercase">
                    AI Platform
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={handleToggleCollapse}
              id="btn-toggle-sidebar"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition"
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Scrollable Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
            {/* Academic Wing Section (Strictly for Students & Admins) */}
            {(user.role === 'student' || user.role === 'admin') && (
              <div>
                {(!isCollapsed || isMobileOpen) && (
                  <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Academic Wing
                  </p>
                )}
                <div className="space-y-1">
                  {studentNavItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        id={`nav-${item.id}`}
                        title={isCollapsed && !isMobileOpen ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                          transition-all duration-150 group relative
                          ${
                            isActive
                              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/80'
                          }
                          ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                        `}
                      >
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'
                          }`}
                        />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate text-left flex-1">{item.label}</span>
                        )}
                        {(!isCollapsed || isMobileOpen) && item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isActive
                                ? 'bg-white/20 text-white border-white/30'
                                : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Tooltip on collapsed desktop view */}
                        {isCollapsed && !isMobileOpen && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            {item.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Creator Wing Section (Strictly for Creators & Admins) */}
            {(user.role === 'creator' || user.role === 'admin') && (
              <div>
                {(!isCollapsed || isMobileOpen) && (
                  <div className="px-3 flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Creator Wing
                    </p>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      Gen AI
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {creatorNavItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive =
                      currentView === item.id ||
                      (item.id === 'creator-hub' && currentView === 'creator-dashboard');
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        id={`nav-${item.id}`}
                        title={isCollapsed && !isMobileOpen ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                          transition-all duration-150 group relative
                          ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                          }
                          ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                        `}
                      >
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                          }`}
                        />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate text-left flex-1">{item.label}</span>
                        )}
                        {(!isCollapsed || isMobileOpen) && item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              isActive
                                ? 'bg-white/20 text-white border-white/30'
                                : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Tooltip on collapsed desktop view */}
                        {isCollapsed && !isMobileOpen && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            {item.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Admin Section (Shown for admin role or user quick switch) */}
            {user.role === 'admin' && (
              <div>
                {(!isCollapsed || isMobileOpen) && (
                  <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Governance
                  </p>
                )}
                <div className="space-y-1">
                  {adminNavItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = currentView === 'admin' || currentView === 'admin-dashboard';
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        id={`nav-${item.id}`}
                        title={isCollapsed && !isMobileOpen ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                          transition-all duration-150 group relative
                          ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                          }
                          ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                        `}
                      >
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                          }`}
                        />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate text-left flex-1">{item.label}</span>
                        )}
                        {(!isCollapsed || isMobileOpen) && item.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            {item.badge}
                          </span>
                        )}

                        {/* Tooltip on collapsed desktop view */}
                        {isCollapsed && !isMobileOpen && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            {item.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Bottom: User Profile Card & Quick Actions */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
            {(!isCollapsed || isMobileOpen) ? (
              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 flex items-center justify-between gap-3">
                <div
                  onClick={() => handleItemClick('profile')}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                  title="View Profile & XP"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}
                    alt={user.fullName}
                    className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 border border-sky-500/30 object-cover shrink-0 group-hover:ring-2 group-hover:ring-sky-500/50 transition"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition">
                      {user.fullName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-sky-600 dark:text-sky-400 truncate">{user.uid}</span>
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <span className="capitalize">{user.role}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  id="btn-sidebar-logout"
                  title="Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <img
                  onClick={() => handleItemClick('profile')}
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}
                  alt={user.fullName}
                  title={`${user.fullName} (${user.uid}) - Click for Profile`}
                  className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 border border-sky-500/30 object-cover cursor-pointer hover:ring-2 hover:ring-sky-500/50 transition"
                />
                <button
                  onClick={logout}
                  title="Log out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN DASHBOARD CONTENT AREA */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Sticky Header */}
          <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 sticky top-0 z-30 flex items-center justify-between gap-4">
            {/* Left: Mobile Drawer Trigger + Active View Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb Title */}
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <CurrentIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Remly</span>
                    <span>/</span>
                    <span className="text-sky-600 dark:text-sky-400 truncate">{currentMeta.category}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-heading leading-tight">
                    {currentMeta.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Right: Quick Stats, Notifications, Theme, Profile Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Streak Pill */}
              <div
                onClick={() => onNavigate('profile')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer hover:bg-amber-500/15 transition"
                title={`${user.learningStreak || 1} day study streak!`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{user.learningStreak || 1} Days</span>
              </div>

              {/* Level & XP Pill */}
              <div
                onClick={() => onNavigate('profile')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs cursor-pointer hover:bg-sky-500/15 transition"
                title={`Level ${currentLevel} • ${currentXp} XP`}
              >
                <Award className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span className="font-bold text-slate-900 dark:text-white">Lvl {currentLevel}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">({currentXp} XP)</span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                id="btn-header-theme"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>

              {/* Notifications Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  id="btn-header-notifications"
                  title="Notifications"
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                          No notifications right now.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-3 rounded-xl text-xs transition cursor-pointer border ${
                              n.read
                                ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 text-slate-500 dark:text-slate-400'
                                : 'bg-slate-100/80 dark:bg-slate-800/80 border-sky-500/30 text-slate-800 dark:text-slate-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">{n.title}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {new Date(n.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  id="btn-header-profile-menu"
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-sky-500/30 object-cover shadow-sm"
                  />
                  <div className="hidden xl:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {user.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 leading-none">
                      {user.uid}
                    </span>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 space-y-3">
                    {/* User Header */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{user.fullName}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>

                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <span>UID: {user.uid}</span>
                        <button
                          onClick={copyUid}
                          className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[10px]"
                          title="Copy Permanent UID"
                        >
                          {copiedUid ? (
                            <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="space-y-1">
                      {user.role === 'student' && (
                        <>
                          <button
                            onClick={() => {
                              onNavigate('profile');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                          >
                            <UserIcon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                            <span>View Profile & XP</span>
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('assignments');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                          >
                            <FileCheck2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            <span>Assignment Solver</span>
                          </button>
                        </>
                      )}

                      {user.role === 'creator' && (
                        <button
                          onClick={() => {
                            onNavigate('creator-generator');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                        >
                          <Palette className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                          <span>AI Image Studio</span>
                        </button>
                      )}

                      {onViewLanding && (
                        <button
                          onClick={() => {
                            onViewLanding();
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                          <span>View Public Landing Page</span>
                        </button>
                      )}
                    </div>

                    {/* Sign out */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        id="btn-header-logout"
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of Remly</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable View Area */}
          <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
