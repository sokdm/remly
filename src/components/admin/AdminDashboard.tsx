import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { REMLY_CONFIG } from '../../config/remlyConfig';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Palette,
  BookOpen,
  Calendar,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  CheckCircle2,
  Key,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
    } catch (err) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ banned: !currentBanned }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Failed to update user status.', 'error');
      }
    } catch (err) {
      showToast('Network error updating user.', 'error');
    }
  };

  const handleToggleAcademicRestriction = async (userId: string, currentRestricted: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/restriction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ restricted: !currentRestricted }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Failed to update restriction.', 'error');
      }
    } catch (err) {
      showToast('Network error updating academic restriction.', 'error');
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPass = prompt('Enter new temporary password for this user (min 6 characters):', 'RemlyPass123!');
    if (!newPass) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Password reset failed.', 'error');
      }
    } catch (err) {
      showToast('Network error resetting password.', 'error');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <h1 className="text-2xl font-bold text-white font-heading">
              Platform Administration & Compliance
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            System overview, user account administration, academic compliance, and security monitoring.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* System Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Users</span>
            <span className="text-xl font-bold text-white mt-1 block">{stats.totalUsers}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Students</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">{stats.totalStudents}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Creators</span>
            <span className="text-xl font-bold text-indigo-400 mt-1 block">{stats.totalCreators}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Scheduled Classes</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{stats.totalClasses}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Exams Taken</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">{stats.totalAttempts}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Studio Generations</span>
            <span className="text-xl font-bold text-purple-400 mt-1 block">{stats.totalGenerations}</span>
          </div>
        </div>
      )}

      {/* User Management Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-white font-heading">
            User Accounts & Academic Integrity Registry ({users.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UID, name, email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">User & UID</th>
                <th className="p-3">Role</th>
                <th className="p-3">Country</th>
                <th className="p-3">XP / Level</th>
                <th className="p-3">Compliance</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-850/50 transition">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center font-bold text-xs">
                        {u.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{u.fullName}</span>
                        <span className="font-mono text-[10px] text-sky-400">UID: {u.uid}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300'
                          : u.role === 'creator'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="p-3 text-slate-300">
                    <span className="flex items-center gap-1">
                      <span>{REMLY_CONFIG.countries.find((c) => c.name === u.country)?.flag || '🌐'}</span>
                      <span className="truncate max-w-[100px]">{u.country || 'Global'}</span>
                    </span>
                  </td>

                  <td className="p-3 text-slate-300">
                    <span className="font-semibold text-white">L{u.level || 1}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({u.xp || 0} XP)</span>
                  </td>

                  <td className="p-3">
                    {u.academicRestricted ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                        Restricted
                      </span>
                    ) : u.missedExamsCount && u.missedExamsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                        {u.missedExamsCount} Missed
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> In Good Standing
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {u.isBanned ? (
                      <span className="text-rose-400 font-bold text-[10px] uppercase">Suspended</span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] uppercase">Active</span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Reset user password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleAcademicRestriction(u.id, !!u.academicRestricted)}
                        className={`p-1.5 rounded-lg transition ${
                          u.academicRestricted
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={u.academicRestricted ? 'Lift academic restriction' : 'Impose restriction'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                          className={`p-1.5 rounded-lg transition ${
                            u.isBanned
                              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                          }`}
                          title={u.isBanned ? 'Unban account' : 'Suspend account'}
                        >
                          {u.isBanned ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
