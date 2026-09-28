import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Key } from 'lucide-react';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'supplier'; 
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Check role after login
        if (data.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          const userRole = profileData?.role || role;
          
          if (userRole === 'admin') {
            navigate('/admin');
          } else {
            navigate(`/${userRole}`);
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        alert("Registration successful! (In a real app, check email for verification). You can now login.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = () => {
    if (role === 'buyer') return 'emerald';
    return 'blue';
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
        <div>
          <div className={`mx-auto h-16 w-16 bg-${getRoleColor()}-100 rounded-full flex items-center justify-center text-${getRoleColor()}-600 mb-6 shadow-sm`}>
            <Lock size={32} />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900 capitalize tracking-tight">
            {role} Portal
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 font-medium">
            {isLogin ? 'Sign in to access your dashboard' : 'Create a new account'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`appearance-none rounded-xl relative block w-full px-4 py-3 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-${getRoleColor()}-500 focus:border-${getRoleColor()}-500 focus:z-10 sm:text-sm transition-all`}
                  placeholder="admin@demo.agricredx.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none rounded-xl relative block w-full px-4 py-3 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-${getRoleColor()}-500 focus:border-${getRoleColor()}-500 focus:z-10 sm:text-sm transition-all`}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-${getRoleColor()}-600 hover:bg-${getRoleColor()}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${getRoleColor()}-500 transition-all shadow-md hover:shadow-lg disabled:opacity-50`}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className={`text-sm font-medium text-${getRoleColor()}-600 hover:text-${getRoleColor()}-500`}
          >
            {isLogin ? "Don't have an account? Register here" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
