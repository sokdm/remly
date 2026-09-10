import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { StudentDashboard } from './components/student/StudentDashboard';
import { AITutorView } from './components/student/AITutorView';
import { ClassesView } from './components/student/ClassesView';
import { ExamsView } from './components/student/ExamsView';
import { ProfileProgressView } from './components/student/ProfileProgressView';
import { AssignmentSolverView } from './components/student/AssignmentSolverView';
import { CreatorDashboard } from './components/creator/CreatorDashboard';
import { CreatorImageGenerator } from './components/creator/CreatorImageGenerator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CommunityView } from './components/community/CommunityView';
import { ScheduledClass } from './types';
import { ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();

  // Navigation View State
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isViewingLanding, setIsViewingLanding] = useState<boolean>(false);

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<'student' | 'creator'>('student');

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', role: 'student' | 'creator' = 'student') => {
    setAuthMode(mode);
    setAuthInitialRole(role);
    setIsAuthOpen(true);
  };

  // If user role is creator, default view might be creator-hub
  React.useEffect(() => {
    if (user) {
      setIsViewingLanding(false);
      if (user.role === 'creator') {
        setCurrentView('creator-hub');
      } else if (user.role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs font-semibold tracking-wider uppercase text-sky-400">
          Initializing Remly...
        </span>
      </div>
    );
  }

  // Not authenticated: Render Landing Page
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-sky-500 selection:text-white">
        <Navbar
          currentView="landing"
          onNavigate={(view) => {
            if (view === 'login') handleOpenAuth('login');
            if (view === 'register') handleOpenAuth('register');
          }}
          onOpenAuth={(mode) => handleOpenAuth(mode)}
        />
        <LandingPage onOpenAuth={handleOpenAuth} />

        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authMode}
          initialRole={authInitialRole}
          onClose={() => setIsAuthOpen(false)}
        />
      </div>
    );
  }

  // Authenticated user choosing to preview public landing page
  if (isViewingLanding) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-sky-500 selection:text-white">
        {/* Floating Return Bar */}
        <div className="sticky top-0 z-50 bg-slate-900/95 border-b border-sky-500/30 backdrop-blur-md px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Signed in as <strong className="text-white">{user.fullName}</strong> ({user.role})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsViewingLanding(false)}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Back to Full Dashboard</span>
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <LandingPage onOpenAuth={() => setIsViewingLanding(false)} />
      </div>
    );
  }

  // Authenticated App View: Full Dashboard with Collapsible Sidebar
  return (
    <DashboardLayout
      currentView={currentView}
      onNavigate={(view) => {
        if (view === 'home' || view === 'landing') {
          setIsViewingLanding(true);
          return;
        }

        // Strict role-based navigation enforcement:
        // Student cannot access Creator views
        const isCreatorView = ['creator-hub', 'creator-dashboard', 'creator-generator', 'creator-projects'].includes(view);
        if (user.role === 'student' && isCreatorView) {
          setCurrentView('dashboard');
          return;
        }

        // Creator cannot access Student views (except profile/settings)
        const isStudentView = ['dashboard', 'tutor', 'assignments', 'assignment-solver', 'classes', 'exams'].includes(view);
        if (user.role === 'creator' && isStudentView) {
          setCurrentView('creator-hub');
          return;
        }

        setCurrentView(view);
      }}
      onViewLanding={() => setIsViewingLanding(true)}
    >
      {/* Student Views (Academic Wing) */}
      {user.role !== 'creator' && (
        <>
          {currentView === 'dashboard' && (
            <StudentDashboard onNavigate={(v) => setCurrentView(v)} />
          )}
          {currentView === 'tutor' && <AITutorView />}
          {(currentView === 'assignments' || currentView === 'assignment-solver') && (
            <AssignmentSolverView />
          )}
          {currentView === 'classes' && (
            <ClassesView
              onStartClassSession={(_cls: ScheduledClass) => {
                setCurrentView('tutor');
              }}
            />
          )}
          {currentView === 'exams' && <ExamsView />}
        </>
      )}

      {/* Shared User Profile View */}
      {currentView === 'profile' && <ProfileProgressView />}

      {/* Global Community View (Available to both students, creators & admins) */}
      {currentView === 'community' && <CommunityView />}

      {/* Creator Views (Creator Wing) */}
      {user.role !== 'student' && (
        <>
          {(currentView === 'creator-hub' || currentView === 'creator-dashboard') && (
            <CreatorDashboard onNavigate={(v) => setCurrentView(v)} />
          )}
          {currentView === 'creator-generator' && <CreatorImageGenerator />}
          {currentView === 'creator-projects' && (
            <CreatorDashboard onNavigate={(v) => setCurrentView(v)} />
          )}
        </>
      )}

      {/* Admin Views */}
      {user.role === 'admin' && (currentView === 'admin' || currentView === 'admin-dashboard') && (
        <AdminDashboard />
      )}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
