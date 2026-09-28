import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract } from '../lib/contract';
import { ethers } from 'ethers';

export default function BuyerDashboard() {
  const { isConnected, signer } = useWallet();
  const [receivableId, setReceivableId] = useState('');
  const [activeReceivable, setActiveReceivable] = useState<any>(null);
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
      setTxHash(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to fetch receivable");
    }
  };

  const handleAction = async (actionType: 'ACCEPT' | 'REPAY') => {
    if (!signer || !activeReceivable) return;
    setIsSubmitting(true);
    setTxHash(null);
    try {
      const contract = getAgriCredXContract(signer);
      let tx;
      if (actionType === 'ACCEPT') {
        tx = await contract.buyerAccept(activeReceivable.id);
      } else {
        const parsedAmount = ethers.parseEther(activeReceivable.amount);
        tx = await contract.markRepaid(activeReceivable.id, { value: parsedAmount });
      }
      setTxHash(tx.hash);
      await tx.wait();
      alert("Transaction confirmed!");
      await fetchReceivable(); // refresh state
    } catch (err: any) {
      console.error(err);
      alert(err.reason || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMap = ["CREATED", "VERIFIED", "BUYER_ACCEPTED", "ATTESTED", "FINANCEABLE", "FUNDED", "OUTSTANDING", "REPAID", "CLOSED", "DISPUTED"];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Buyer Dashboard</h1>
          <p className="text-emerald-100 mt-2 text-lg">Review verified invoices, sign acceptances, and manage repayments securely.</p>
        </div>
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/4">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
      </div>

      {!isConnected && (
        <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl text-amber-800 font-medium flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>
          Please connect your BridgeKey wallet to interact with the blockchain.
        </div>
      )}

      {isConnected && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Search Panel */}
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              Lookup Receivable
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Receivable ID</label>
                <input 
                  type="number"
                  value={receivableId}
                  onChange={(e) => setReceivableId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <button 
                onClick={fetchReceivable}
                disabled={!receivableId}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                Fetch Details
              </button>
            </div>
          </div>

          {/* Action Panel */}
          <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow min-h-[300px]">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Receivable Action Center</h2>
            
            {!activeReceivable ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 pb-8">
                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p>Fetch a receivable to view available actions.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice ID</p>
                    <p className="font-mono text-slate-800 font-medium">{activeReceivable.invoiceId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</p>
                    <p className="font-bold text-emerald-600">{activeReceivable.amount} INR</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mt-1">
                      {statusMap[activeReceivable.status]}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Buyer</p>
                    <p className="font-mono text-xs text-slate-600 truncate">{activeReceivable.buyer}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  {activeReceivable.status === 1 /* VERIFIED */ && (
                    <button 
                      onClick={() => handleAction('ACCEPT')}
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Processing...' : 'Accept Receivable'}
                    </button>
                  )}
                  {activeReceivable.status === 6 /* OUTSTANDING */ && (
                    <button 
                      onClick={() => handleAction('REPAY')}
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Processing...' : 'Mark Repaid'}
                    </button>
                  )}
                  {activeReceivable.status !== 1 && activeReceivable.status !== 6 && (
                    <div className="w-full text-center p-3 text-sm text-slate-500 bg-slate-50 rounded-lg">
                      No buyer actions available for status: {statusMap[activeReceivable.status]}
                    </div>
                  )}
                </div>
                
                {txHash && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 break-all font-mono">
                    <strong>TX Confirmed:</strong> {txHash}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
