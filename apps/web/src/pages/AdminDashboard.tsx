import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Users, Activity, LogOut, Flag, Trash2, CheckCircle2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, receivables: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load flags from local storage for demo persistence
    const savedFlags = JSON.parse(localStorage.getItem('admin_flagged_users') || '[]');
    const savedRemoved = JSON.parse(localStorage.getItem('admin_removed_users') || '[]');
    setFlaggedIds(savedFlags);
    setRemovedIds(savedRemoved);

    async function loadData() {
      // Load general stats
      const { count: rCount } = await supabase.from('receivables').select('*', { count: 'exact', head: true });
      
      // Load users
      const { data: profiles } = await supabase.from('profiles').select(`
        id, email, role, wallet_address,
        organizations (name, type)
      `);

      if (profiles) {
        setUsers(profiles);
        setStats({
          users: profiles.length || 0,
          receivables: rCount || 0
        });
      }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleFlag = (id: string) => {
    const newFlags = flaggedIds.includes(id) 
      ? flaggedIds.filter(fid => fid !== id)
      : [...flaggedIds, id];
    setFlaggedIds(newFlags);
    localStorage.setItem('admin_flagged_users', JSON.stringify(newFlags));
  };

  const removeUser = (id: string) => {
    if(window.confirm("Are you sure you want to suspend this user? They will no longer be able to interact with the platform.")) {
      const newRemoved = [...removedIds, id];
      setRemovedIds(newRemoved);
      localStorage.setItem('admin_removed_users', JSON.stringify(newRemoved));
    }
  };

  const addSimulatedUser = () => {
    alert("Simulated user addition modal would open here. (Demo feature)");
  };

  // Filter out removed users
  const visibleUsers = users.filter(u => !removedIds.includes(u.id));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header section */}
      <div className="bg-slate-900 p-8 rounded-3xl shadow-lg text-white relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
              <ShieldCheck className="mr-3 text-red-500" size={36} />
              Protocol Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-2 text-lg">System governance, user verification, and risk management.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-900/20"
          >
            <LogOut className="mr-2" size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl mr-6">
            <Users size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Platform Users</p>
            <p className="text-4xl font-black text-slate-900">{visibleUsers.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 bg-slate-100 text-slate-700 rounded-2xl mr-6">
            <Activity size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Anchored Contracts</p>
            <p className="text-4xl font-black text-slate-900">{stats.receivables}</p>
          </div>
        </div>
      </div>

      {/* User Governance Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Identity & Governance</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage network participants, buyers, and suppliers.</p>
          </div>
          <button 
            onClick={addSimulatedUser}
            className="flex items-center px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors"
          >
            <UserPlus size={16} className="mr-2" />
            Add Organization
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-8 py-4">Participant Entity</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Network Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.map((u) => {
                const isFlagged = flaggedIds.includes(u.id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900">{u.organizations?.name || 'Unknown Entity'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{u.email}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                        u.role === 'buyer' ? 'bg-emerald-100 text-emerald-800' :
                        u.role === 'supplier' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'admin' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {isFlagged ? (
                        <span className="inline-flex items-center text-red-600 font-bold text-xs bg-red-50 px-2.5 py-1 rounded-md">
                          <Flag size={14} className="mr-1.5" /> High Risk (Flagged)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-600 font-bold text-xs">
                          <CheckCircle2 size={14} className="mr-1.5" /> Verified Clean
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right space-x-3">
                      {u.role !== 'admin' && (
                        <>
                          <button 
                            onClick={() => toggleFlag(u.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isFlagged ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            }`}
                            title={isFlagged ? "Remove Flag" : "Flag User Activity"}
                          >
                            <Flag size={16} />
                          </button>
                          <button 
                            onClick={() => removeUser(u.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Suspend Participant"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-8 text-center text-slate-500 font-medium">
                    No active participants found in the network.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
