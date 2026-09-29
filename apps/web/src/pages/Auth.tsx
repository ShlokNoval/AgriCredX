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

  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let isRegistering = !isLogin;
      let loginData, loginError;

      if (isLogin) {
        const res = await supabase.auth.signInWithPassword({ email, password });
        loginData = res.data;
        loginError = res.error;
        
        // Seamless Registration: if user doesn't exist during a demo, sign them up.
        if (loginError && loginError.message.includes('Invalid login credentials')) {
          isRegistering = true;
          // We don't have companyName if they tried to login, but we'll try to sign them up anyway.
        } else if (loginError) {
          throw loginError;
        }
      }

      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (companyName) {
          // Save company name to local backend mapping for demo purposes
          fetch('/api/set-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, companyName })
          }).catch(e => console.error(e));
        }

        if (email.toLowerCase() === 'admin@demo.agricredx.com' && data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: email,
            role: 'admin',
            wallet_address: '0x0000000000000000000000000000000000000000'
          });
          navigate('/admin');
          return;
        }

        // After sign up, sign them in automatically
        const autoSignIn = await supabase.auth.signInWithPassword({ email, password });
        if (autoSignIn.error) throw autoSignIn.error;
        loginData = autoSignIn.data;
      }

      // Check role after successful login
      if (loginData?.user) {
        if (email.toLowerCase() === 'admin@demo.agricredx.com') {
          navigate('/admin');
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', loginData.user.id)
          .single();
          
        const userRole = profileData?.role || role;
        
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate(`/${userRole}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const getTheme = () => {
    if (role === 'buyer') {
      return {
        bg: 'bg-emerald-600',
        hoverBg: 'hover:bg-emerald-700',
        ring: 'focus:ring-emerald-500',
        border: 'focus:border-emerald-500',
        lightBg: 'bg-emerald-100',
        text: 'text-emerald-600'
      };
    }
    return {
      bg: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-700',
      ring: 'focus:ring-blue-500',
      border: 'focus:border-blue-500',
      lightBg: 'bg-blue-100',
      text: 'text-blue-600'
    };
  };

  const theme = getTheme();

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
        <div>
          <div className={`mx-auto h-16 w-16 ${theme.lightBg} rounded-full flex items-center justify-center ${theme.text} mb-6 shadow-sm`}>
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
                  className={`appearance-none rounded-xl relative block w-full px-4 py-3 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 ${theme.ring} ${theme.border} focus:z-10 sm:text-sm transition-all`}
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
                  className={`appearance-none rounded-xl relative block w-full px-4 py-3 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 ${theme.ring} ${theme.border} focus:z-10 sm:text-sm transition-all`}
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Company / Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={`appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 ${theme.ring} ${theme.border} focus:z-10 sm:text-sm transition-all`}
                    placeholder={`e.g. Acme ${role === 'buyer' ? 'Foods' : 'Logistics'}`}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white ${theme.bg} ${theme.hoverBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.ring} transition-all shadow-md hover:shadow-lg disabled:opacity-50`}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className={`text-sm font-medium ${theme.text} hover:opacity-80 transition-opacity`}
          >
            {isLogin ? "Don't have an account? Register here" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
