import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-96 h-96 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="mb-6 inline-flex items-center px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-800 font-semibold text-sm shadow-sm">
        <span className="flex h-2 w-2 relative mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
        Live on MST Testnet
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-red-900 to-slate-900 tracking-tight mb-6 drop-shadow-sm">
        Institutional Trade Finance,<br /> Secured by Blockchain.
      </h1>
      <p className="text-xl text-slate-600 max-w-3xl mb-16 font-medium">
        AgriCredX bridges off-chain supply chain documentation with on-chain cryptographic trust. Convert your physical agricultural invoices into verifiable, financeable, high-yield assets.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link 
          to="/auth?role=supplier" 
          className="group relative flex flex-col p-8 bg-white/70 backdrop-blur-md border border-slate-200 rounded-3xl hover:border-red-400 hover:shadow-2xl hover:shadow-red-500/10 transition-all text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-transparent opacity-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-red-700 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/30 group-hover:-translate-y-1 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m3 15 2 2 4-4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Supplier Portal</h2>
          <p className="text-slate-600 font-medium leading-relaxed">Tokenize your agricultural invoices and request instant liquidity from institutional financiers.</p>
        </Link>

        <Link 
          to="/auth?role=buyer" 
          className="group relative flex flex-col p-8 bg-white/70 backdrop-blur-md border border-slate-200 rounded-3xl hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent opacity-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:-translate-y-1 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-7l-2-2a4 4 0 0 0-5.66 0H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-.34a4 4 0 0 0-5.66 0l-2 2Z"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Buyer Portal</h2>
          <p className="text-slate-600 font-medium leading-relaxed">Review AI-attested deliveries and cryptographically sign off on trade acceptances via BridgeKey.</p>
        </Link>
      </div>
    </div>
  );
}
