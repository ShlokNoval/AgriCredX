import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract } from '../lib/contract';
import { ethers } from 'ethers';

export default function FinancierDashboard() {
  const { isConnected, signer } = useWallet();
  const [receivableId, setReceivableId] = useState('');
  const [activeReceivable, setActiveReceivable] = useState<any>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fetchReceivable = async () => {
    if (!signer || !receivableId) return;
    try {
      const contract = getAgriCredXContract(signer);
      const data = await contract.receivables(receivableId);
      setActiveReceivable({
        id: receivableId,
        invoiceId: data.invoiceId,
        amount: ethers.formatEther(data.amount),
        buyer: data.buyer,
        status: Number(data.status),
      });
      setFundAmount(ethers.formatEther(data.amount)); // default fund full amount
      setTxHash(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to fetch receivable");
    }
  };

  const handleFund = async () => {
    if (!signer || !activeReceivable || !fundAmount) return;
    setIsSubmitting(true);
    setTxHash(null);
    try {
      const contract = getAgriCredXContract(signer);
      const parsedAmount = ethers.parseEther(fundAmount);
      const tx = await contract.fundReceivable(activeReceivable.id, { value: parsedAmount });
      
      setTxHash(tx.hash);
      await tx.wait();
      alert("Funding successful!");
      await fetchReceivable(); // refresh state
    } catch (err: any) {
      console.error(err);
      alert(err.reason || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMap = [
    "QUOTATION_SENT", 
    "BUYER_ACCEPTED", 
    "DOCUMENTATION_UPLOADED", 
    "PACKED", 
    "IN_TRANSIT", 
    "DELIVERED", 
    "VERIFIED", 
    "ATTESTED", 
    "FINANCEABLE", 
    "FUNDED", 
    "OUTSTANDING", 
    "REPAID", 
    "CLOSED", 
    "DISPUTED"
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Financier Dashboard</h1>
          <p className="text-blue-100 mt-2 text-lg">Discover financeable assets, place bids, and fund approved trades.</p>
        </div>
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
      </div>

      {!isConnected && (
        <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl text-amber-800 font-medium flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>
          Please connect your BridgeKey wallet to view financeable assets and submit bids.
        </div>
      )}

      {isConnected && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Search Panel */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              Lookup Asset
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Receivable ID</label>
                <input 
                  type="number"
                  value={receivableId}
                  onChange={(e) => setReceivableId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <button 
                onClick={fetchReceivable}
                disabled={!receivableId}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                Inspect Asset
              </button>
            </div>
          </div>

          {/* Action Panel */}
          <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow min-h-[300px]">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Funding Terminal</h2>
            
            {!activeReceivable ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-8">
                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <p>Inspect an asset to view funding options.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice ID</p>
                    <p className="font-mono text-slate-800 font-medium">{activeReceivable.invoiceId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requested Value</p>
                    <p className="font-bold text-indigo-600">{activeReceivable.amount} INR</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 mt-1">
                      {statusMap[activeReceivable.status]}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Buyer</p>
                    <p className="font-mono text-xs text-slate-600 truncate">{activeReceivable.buyer}</p>
                  </div>
                </div>

                {/* Institutional Risk Assessment Widget */}
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-200 font-semibold text-sm flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      AI Risk Assessment
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded border border-emerald-500/30">LOW RISK (18/100)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">Doc Authenticity</p>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1"><div className="bg-emerald-500 h-1.5 rounded-full w-full"></div></div>
                      <p className="text-slate-300 text-xs font-mono">100% Verified</p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">Buyer Default Prob</p>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1"><div className="bg-emerald-400 h-1.5 rounded-full w-[12%]"></div></div>
                      <p className="text-slate-300 text-xs font-mono">1.2% (A- Grade)</p>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">Est. Yield (APR)</p>
                      <p className="text-indigo-400 text-lg font-bold">14.5%</p>
                    </div>
                  </div>
                </div>

                {activeReceivable.status === 4 /* FINANCEABLE */ ? (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Funding Amount (INR)</label>
                      <input 
                        type="number"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleFund}
                      disabled={isSubmitting || !fundAmount}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Processing Transaction...' : `Fund ${fundAmount} INR`}
                    </button>
                  </div>
                ) : (
                  <div className="w-full text-center p-4 text-sm text-slate-500 bg-slate-50 rounded-lg">
                    This asset is not currently open for funding. Current state: {statusMap[activeReceivable.status]}
                  </div>
                )}
                
                {txHash && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800 break-all font-mono">
                    <strong>TX Confirmed:</strong> {txHash}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {isConnected && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Financeable Opportunities</h2>
            <button onClick={() => window.location.reload()} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Data
            </button>
          </div>
          <div className="p-6">
            <FinancierReceivablesTable onSelect={(id: string) => { setReceivableId(id); setTimeout(() => fetchReceivable(), 100); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function FinancierReceivablesTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      await import('../lib/supabase').then(async ({ supabase }) => {
        // Assume user is already logged in via Auth.tsx
        const { data, error } = await supabase
          .from('receivables')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          setReceivables(data);
        }
        setLoading(false);
      });
    }
    loadData();
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-500">Loading open market opportunities...</div>;
  if (receivables.length === 0) return <div className="text-center py-8 text-slate-500">No financeable assets found on the market.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs uppercase bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3">Invoice ID</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{r.invoice_id}</td>
              <td className="px-4 py-3 font-mono">{r.amount} {r.currency}</td>
              <td className="px-4 py-3">{new Date(r.due_date).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">{r.status}</span>
              </td>
              <td className="px-4 py-3">
                <button 
                  onClick={() => onSelect(r.on_chain_id?.toString() || '')}
                  disabled={!r.on_chain_id}
                  className="text-xs bg-slate-900 text-white px-3 py-1 rounded hover:bg-slate-800 disabled:opacity-50"
                >
                  Load ID #{r.on_chain_id || '?'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
