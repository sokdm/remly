import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import {
  X,
  GraduationCap,
  Sparkles,
  Palette,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  User,
  Globe,
  ChevronDown,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
  initialRole?: 'student' | 'creator';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'student',
  onSuccess,
}) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'role_select' | 'register' | 'forgot' | 'verify_otp' | 'reset_password'>(
    initialMode === 'register' ? 'role_select' : initialMode
  );
  const [selectedRole, setSelectedRole] = useState<'student' | 'creator'>(initialRole);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [age, setAge] = useState('18');
  const [country, setCountry] = useState('United States');
  const [countryCode, setCountryCode] = useState('US');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [otp, setOtp] = useState('');

  // Validation & Loading
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'register' ? 'role_select' : initialMode);
      setSelectedRole(initialRole);
      setErrorMessage('');
    }
  }, [isOpen, initialMode, initialRole]);

  // Debounced backend username availability check
  useEffect(() => {
    if (!username || username.trim().length < 3 || mode !== 'register') {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username.trim().toLowerCase())}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch (err) {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, mode]);

  if (!isOpen) return null;

  // 1-Click Demo Login
  const handleQuickDemo = async (role: 'student' | 'creator' | 'admin') => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (role === 'admin') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'admin@remly.edu', password: 'Admin@Remly2026!' }),
        });
        const data = await res.json();
        if (res.ok) {
          login(data.token, data.user);
          showToast('Signed in as Administrator', 'success');
          onClose();
          if (onSuccess) onSuccess();
          return;
        }
      }

      // Auto create or login a demo account
      const demoEmail = `demo_${role}@remly.edu`;
      const demoUser = `demo_${role}`;
      const demoPass = 'DemoPassword123!';

      // Try login first
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: demoEmail, password: demoPass }),
      });

      if (!res.ok) {
        // Register if not yet seeded
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: role === 'student' ? 'Alex Rivera (Demo Student)' : 'Sarah Chen (Demo Creator)',
            username: demoUser,
            email: demoEmail,
            password: demoPass,
            role,
            country: 'United States',
            countryCode: 'US',
            age: 20,
          }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast(`Signed in as Demo ${role.toUpperCase()}`, 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.error || 'Demo login failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast(`Welcome back, ${data.user.fullName}!`, 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.error || 'Login failed.');
      }
    } catch (err: any) {
      setErrorMessage('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameAvailable === false) {
      setErrorMessage('Please choose an available username.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password,
          role: selectedRole,
          country,
          countryCode,
          age: selectedRole === 'student' ? Number(age) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        showToast(`Account created! Welcome to Remly.`, 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMessage('Registration error. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Verification OTP sent to your email.', 'info');
        setMode('verify_otp');
      } else {
        setErrorMessage(data.error || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setErrorMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('OTP verified. Set your new password.', 'success');
        setMode('reset_password');
      } else {
        setErrorMessage(data.error || 'Invalid OTP code.');
      }
    } catch (err) {
      setErrorMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password updated! You can now log in.', 'success');
        setMode('login');
      } else {
        setErrorMessage(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setErrorMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = REMLY_CONFIG.countries.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Banner */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-wider text-white font-heading">
            {REMLY_CONFIG.appName}
          </span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ----------------- MODE: ROLE SELECTION ----------------- */}
        {mode === 'role_select' && (
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Choose Your Path</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your primary focus. You can expand into both later!
            </p>

            <div className="grid grid-cols-1 gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedRole('student');
                  setMode('register');
                }}
                className="group p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-sky-500 hover:bg-sky-950/10 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-sky-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-sky-400 transition">
                    Continue as Student
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Access {REMLY_CONFIG.aiTutorName}, schedule smart classes, take exams, and earn level XP.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedRole('creator');
                  setMode('register');
                }}
                className="group p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/10 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-indigo-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition">
                    Continue as Creator
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    AI Prompt-to-Image studio, educational assets, content tools, and creator workflows.
                  </p>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 mt-6">
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-sky-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* ----------------- MODE: LOGIN ----------------- */}
        {mode === 'login' && (
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-1">Sign in to your Remly workspace</p>

            {/* Quick Demo Shortcuts */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-2">
                Instant Evaluator Demo Access
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  disabled={loading}
                  className="px-2 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-semibold transition"
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('creator')}
                  disabled={loading}
                  className="px-2 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition"
                >
                  Creator
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  disabled={loading}
                  className="px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition"
                >
                  Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@remly.edu or username"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="btn-submit-login"
                className="w-full mt-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              New to Remly?{' '}
              <button
                onClick={() => setMode('role_select')}
                className="text-sky-400 hover:underline font-semibold"
              >
                Create an account
              </button>
            </p>
          </div>
        )}

        {/* ----------------- MODE: REGISTER ----------------- */}
        {mode === 'register' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white font-heading">
                  Register as {selectedRole === 'student' ? 'Student' : 'Creator'}
                </h2>
                <p className="text-xs text-slate-400">Create your verified Remly profile</p>
              </div>
              <button
                onClick={() => setMode('role_select')}
                className="text-[11px] text-sky-400 hover:underline"
              >
                Switch role
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username (Unique)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. elena_ai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                  <div className="absolute right-3 top-2.5">
                    {isCheckingUsername && <span className="text-[10px] text-slate-400">...</span>}
                    {!isCheckingUsername && usernameAvailable === true && (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                    {!isCheckingUsername && usernameAvailable === false && (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                </div>
                {usernameAvailable === false && (
                  <p className="text-[10px] text-rose-400 mt-1">Username is already in use.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {/* Student specific fields */}
              {selectedRole === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Age</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white flex items-center justify-between"
                    >
                      <span className="truncate">{country}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 bg-slate-950 border border-slate-800 rounded-xl shadow-xl z-50 p-2 overflow-y-auto">
                        <input
                          type="text"
                          placeholder="Search country..."
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
                              setShowCountryDropdown(false);
                            }}
                            className="px-2 py-1.5 hover:bg-slate-900 rounded cursor-pointer text-xs flex items-center gap-2 text-slate-200"
                          >
                            <span>{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
              >
                {loading ? 'Creating Profile...' : 'Complete Registration'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-4">
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-sky-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* ----------------- MODE: FORGOT PASSWORD ----------------- */}
        {mode === 'forgot' && (
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Reset Password</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your account email to receive a 6-digit verification OTP.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@remly.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
            </form>

            <button
              onClick={() => setMode('login')}
              className="block mx-auto mt-4 text-xs text-slate-400 hover:text-white"
            >
              Back to Login
            </button>
          </div>
        )}

        {/* ----------------- MODE: VERIFY OTP ----------------- */}
        {mode === 'verify_otp' && (
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Enter Verification Code</h2>
            <p className="text-xs text-slate-400 mt-1">
              We sent a 6-digit code to <strong className="text-sky-400">{email}</strong>
            </p>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl bg-slate-950 border border-slate-800 rounded-xl py-3 text-white focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            <button
              onClick={() => setMode('forgot')}
              className="block mx-auto mt-4 text-xs text-slate-400 hover:text-white"
            >
              Resend or change email
            </button>
          </div>
        )}

        {/* ----------------- MODE: SET NEW PASSWORD ----------------- */}
        {mode === 'reset_password' && (
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Set New Password</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your new secure password for Remly
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Save & Sign In'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
