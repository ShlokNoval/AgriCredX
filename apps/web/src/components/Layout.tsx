import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { LogOut, Wallet, ShieldAlert } from 'lucide-react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const { address, isConnected, connectWallet, isConnecting, disconnectWallet } = useWallet();
  const location = useLocation();

  const getRoleFromPath = () => {
    if (location.pathname.startsWith('/supplier')) return 'Supplier';
    if (location.pathname.startsWith('/buyer')) return 'Buyer';
    if (location.pathname.startsWith('/financier')) return 'Financier';
    return 'AgriCredX';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 tracking-tight">AgriCredX</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {getRoleFromPath()}
                </span>
              </Link>
              
              <div className="hidden md:flex items-center gap-6 ml-4">
                <Link to="/tamper" className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors flex items-center gap-1">
                  <ShieldAlert size={16} />
                  Judge's Tamper Demo
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-70"
                >
                  <Wallet size={16} />
                  {isConnecting ? 'Connecting...' : 'Connect BridgeKey'}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono">
                    {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Disconnect Wallet"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      
    </div>
  );
}
