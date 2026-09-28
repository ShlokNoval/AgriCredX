import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, FileText, AlertTriangle } from 'lucide-react';

export default function TamperDemo() {
  const [demoState, setDemoState] = useState<'IDLE' | 'VERIFYING' | 'SECURE' | 'TAMPERED'>('IDLE');
  
  const originalHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const tamperedHash = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

  const simulateVerification = (isTampered: boolean) => {
    setDemoState('VERIFYING');
    setTimeout(() => {
      setDemoState(isTampered ? 'TAMPERED' : 'SECURE');
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl text-white relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl text-red-400 border border-red-500/30">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Judge's Tamper Demo</h1>
            <p className="text-slate-400 mt-2 text-lg">Cryptographic Evidence Verification Pipeline</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Scenario 1: Authentic */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Scenario A: Authentic Document</h3>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">Original</span>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-4">
              <div className="text-blue-500"><FileText size={40} /></div>
              <div>
                <p className="font-semibold text-slate-800">INV-2026-09124.pdf</p>
                <p className="text-sm text-slate-500">Amount: ₹850,000</p>
                <p className="text-xs font-mono text-slate-400 mt-2 truncate w-48" title={originalHash}>Hash: {originalHash.substring(0,20)}...</p>
              </div>
            </div>

            <button 
              onClick={() => simulateVerification(false)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              Run AI Verification
            </button>
          </div>

          {/* Scenario 2: Tampered */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">Scenario B: Doctored Invoice</h3>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-red-100">Tampered</span>
            </div>
            
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-4">
              <div className="text-red-500"><FileText size={40} /></div>
              <div>
                <p className="font-semibold text-red-900">INV-2026-09124_EDITED.pdf</p>
                <p className="text-sm text-red-700">Amount: ₹950,000 <span className="text-xs bg-red-200 px-1 rounded ml-1">MANUALLY ALTERED</span></p>
                <p className="text-xs font-mono text-red-400 mt-2 truncate w-48" title={tamperedHash}>Hash: {tamperedHash.substring(0,20)}...</p>
              </div>
            </div>

            <button 
              onClick={() => simulateVerification(true)}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm"
            >
              Run AI Verification
            </button>
          </div>
        </div>

        {/* Results Console */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Verification Terminal</h3>
          <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm h-64 overflow-y-auto border border-slate-800 shadow-inner">
            
            {demoState === 'IDLE' && (
              <p className="text-slate-500">Waiting for document input...</p>
            )}

            {demoState === 'VERIFYING' && (
              <div className="text-blue-400 space-y-2 animate-pulse">
                <p>{">"} INITIALIZING PYMUPDF EXTRACTION...</p>
                <p>{">"} EXTRACTING DOCUMENT TEXT AND METADATA...</p>
                <p>{">"} COMPUTING SHA-256 CRYPTOGRAPHIC HASH...</p>
                <p>{">"} QUERYING MST TESTNET (CHAIN ID: 91562037) FOR ON-CHAIN HASH...</p>
              </div>
            )}

            {demoState === 'SECURE' && (
              <div className="space-y-2">
                <p className="text-slate-400">{">"} COMPUTED HASH: <span className="text-emerald-400">{originalHash}</span></p>
                <p className="text-slate-400">{">"} ON-CHAIN HASH: <span className="text-emerald-400">{originalHash}</span></p>
                <p className="text-slate-400 mt-4">=============================================</p>
                <p className="text-emerald-500 font-bold flex items-center mt-2"><ShieldCheck className="mr-2" /> [SUCCESS] HASH MATCH. DOCUMENT IS AUTHENTIC.</p>
                <p className="text-emerald-400/70 text-xs">AI Risk Pipeline allowed to proceed. Document added to Receivable #1.</p>
              </div>
            )}

            {demoState === 'TAMPERED' && (
              <div className="space-y-2">
                <p className="text-slate-400">{">"} COMPUTED HASH: <span className="text-red-400">{tamperedHash}</span></p>
                <p className="text-slate-400">{">"} ON-CHAIN HASH: <span className="text-emerald-400">{originalHash}</span></p>
                <p className="text-slate-400 mt-4">=============================================</p>
                <p className="text-red-500 font-bold flex items-center mt-2"><AlertTriangle className="mr-2" /> [CRITICAL] HASH MISMATCH DETECTED!</p>
                <p className="text-red-400 text-xs mt-1">The uploaded document has been cryptographically altered since it was minted.</p>
                <p className="text-red-400/70 text-xs">AI Risk Pipeline halted. Asset flagged for fraud.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
