import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Users, Activity, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, receivables: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      // In a real app, we would verify the role via JWT claims or RLS here.
      // For this demo, we'll just count total rows to show it's working.
      const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: rCount } = await supabase.from('receivables').select('*', { count: 'exact', head: true });
      
      setStats({
        users: uCount || 0,
        receivables: rCount || 0
      });
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
              <ShieldCheck className="mr-3 text-red-500" size={36} />
              Protocol Admin Dashboard
            </h1>
            <p className="text-slate-400 mt-2 text-lg">System-wide monitoring and governance.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
          >
            <LogOut className="mr-2" size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl mr-6">
            <Users size={32} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Registered Profiles</p>
            <p className="text-4xl font-extrabold text-slate-900">{stats.users}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl mr-6">
            <Activity size={32} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Receivables</p>
            <p className="text-4xl font-extrabold text-slate-900">{stats.receivables}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System Audit Logs (Simulated)</h2>
        <div className="space-y-3 font-mono text-sm text-slate-600">
          <p className="p-3 bg-slate-50 rounded-lg border border-slate-100">[INFO] AI Risk Engine initialized (Model: Gemini 3 Flash)</p>
          <p className="p-3 bg-slate-50 rounded-lg border border-slate-100">[INFO] MST Testnet connection established (Chain: 91562037)</p>
          <p className="p-3 bg-slate-50 rounded-lg border border-slate-100">[SEC] Admin login detected from internal node.</p>
        </div>
      </div>
    </div>
  );
}
