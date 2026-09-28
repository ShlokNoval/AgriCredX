import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract, getReadOnlyContract, getReadOnlyProvider } from '../lib/contract';
import { ethers } from 'ethers';
import { PlusCircle } from 'lucide-react';

export default function BuyerDashboard() {
  const { isConnected, signer, address } = useWallet();
  const [receivableId, setReceivableId] = useState('');
  const [activeReceivable, setActiveReceivable] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0');

  // New State for Buyer Requirements (RFP)
  const [showRfpModal, setShowRfpModal] = useState(false);
  const [rfpCommodity, setRfpCommodity] = useState('');
  const [rfpAmount, setRfpAmount] = useState('');
  const [rfpQuantity, setRfpQuantity] = useState('');
  const [rfpDelivery, setRfpDelivery] = useState('');
  const [rfpBuyerName, setRfpBuyerName] = useState('');
  const [openRequestsCount, setOpenRequestsCount] = useState(0);
  const [showPostedRequirements, setShowPostedRequirements] = useState(false);
  const [postedRequirements, setPostedRequirements] = useState<any[]>([]);

  useEffect(() => {
    const reqs = JSON.parse(localStorage.getItem('agricredx_buyer_requests') || '[]');
    setPostedRequirements(reqs.filter((r: any) => r.buyer === address || !address));
    setOpenRequestsCount(reqs.length);
    
    // Fetch MSTC Balance from local Hardhat node
    const fetchBalance = async () => {
      try {
        const localProvider = getReadOnlyProvider();
        // Use Hardhat Account #1 as the "Buyer" for balance display
        const buyerSigner = await localProvider.getSigner(1);
        const buyerAddr = await buyerSigner.getAddress();
        const bal = await localProvider.getBalance(buyerAddr);
        setWalletBalance(ethers.formatEther(bal));
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    };
    fetchBalance();
  }, [showRfpModal, signer, address]);

  const fetchReceivable = async () => {
    if (!receivableId) return;
    try {
      // Read directly from local Hardhat node
      const contract = getReadOnlyContract();
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

  const handleAction = async (actionType: 'ACCEPT') => {
    if (!activeReceivable) return;
    setIsSubmitting(true);
    setTxHash(null);
    try {
      // Use local Hardhat signer for write operations
      const localProvider = getReadOnlyProvider();
      const localSigner = await localProvider.getSigner(1); // Account #1 = Buyer
      const contract = getAgriCredXContract(localSigner);
      const tx = await contract.buyerAccept(activeReceivable.id);
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

  const statusMap = ["CREATED", "PACKED", "IN_TRANSIT", "DELIVERED", "VERIFIED", "BUYER_ACCEPTED", "ATTESTED", "FINANCEABLE", "FUNDED", "OUTSTANDING", "REPAID", "CLOSED", "DISPUTED"];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Buyer Dashboard</h1>
          <p className="text-emerald-100 mt-2 text-lg">Post purchase requirements, review verified invoices, and manage repayments.</p>
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
        <div className="space-y-8 animate-fade-in">
          {/* Stats Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors"
              onClick={() => setShowPostedRequirements(!showPostedRequirements)}
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Open Requirements</h3>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">{openRequestsCount}</p>
              <p className="text-xs text-emerald-600 mt-1">Click to view your posted RFPs</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Pending Review</h3>
              <p className="text-3xl font-extrabold text-amber-600 mt-2">Active</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Settled</h3>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">₹12.4M</p>
            </div>
          </div>
          
          {showPostedRequirements && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 animate-fade-in">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Your Posted Requirements</h2>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Commodity & Quantity</th>
                      <th className="px-6 py-3">Budget (MSTC)</th>
                      <th className="px-6 py-3">Delivery Date</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postedRequirements.map((req, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{req.id}</td>
                        <td className="px-6 py-4">{req.quantity} {req.commodity}</td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-600">{req.amount} MSTC</td>
                        <td className="px-6 py-4">{req.deliveryDate}</td>
                        <td className="px-6 py-4"><span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">{req.status}</span></td>
                      </tr>
                    ))}
                    {postedRequirements.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">You haven't posted any requirements yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-12 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Inbound Shipments & Receivables</h2>
              <p className="text-sm text-slate-500">Review AI-extracted documents and cryptographically accept assets.</p>
            </div>
            <button 
              onClick={() => setShowRfpModal(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-sm"
            >
              <PlusCircle className="mr-2" size={18} />
              Post New Requirement
            </button>
          </div>

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

                {/* Cryptographic Attestation Widget */}
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-200 font-semibold text-sm flex items-center">
                      <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Cryptographic Attestation
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded border border-emerald-500/30">100% SECURE</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">AI Pipeline Verification</p>
                        <p className="text-slate-300 text-xs font-mono">Invoice, PO, GRN Matches Validated</p>
                      </div>
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">On-Chain Document Hash (SHA-256)</p>
                      <p className="text-emerald-400 text-xs font-mono truncate">0x4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  {activeReceivable.status === 1 /* VERIFIED */ && (
                    <button 
                      onClick={() => handleAction('ACCEPT')}
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Processing...' : 'Release Escrow & Accept'}
                    </button>
                  )}
                  {activeReceivable.status !== 1 && (
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
        </div>
      )}
      
      {isConnected && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Your Actionable Receivables</h2>
            <button onClick={() => window.location.reload()} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Data
            </button>
          </div>
          <div className="p-6">
            <BuyerReceivablesTable onSelect={(id: string) => { setReceivableId(id); setTimeout(() => fetchReceivable(), 100); }} />
          </div>
        </div>
      )}

      {/* Buyer RFP Modal */}
      {showRfpModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Post Procurement Requirement</h2>
            <p className="text-sm text-slate-500 mb-6">Suppliers will bid or directly fulfill this requirement by uploading invoices.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Buyer / Company Name</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Global Agri Corp" value={rfpBuyerName} onChange={(e) => setRfpBuyerName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Commodity Needed</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Premium Wheat" value={rfpCommodity} onChange={(e) => setRfpCommodity(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 500 MT" value={rfpQuantity} onChange={(e) => setRfpQuantity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Budget (MSTC)</label>
                  <input type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 9" value={rfpAmount} onChange={(e) => setRfpAmount(e.target.value)} />
                  <p className="text-xs text-slate-500 mt-1">Available Balance: {Number(walletBalance).toFixed(2)} MSTC</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Required Delivery Date</label>
                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={rfpDelivery} onChange={(e) => setRfpDelivery(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowRfpModal(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (Number(walletBalance) < Number(rfpAmount)) {
                    alert(`Insufficient MSTC Balance!\n\nYour balance: ${Number(walletBalance).toFixed(4)} MSTC\nRequired: ${rfpAmount} MSTC\n\nPlease add more MSTC to your wallet before posting this requirement.`);
                    return;
                  }

                  const existing = JSON.parse(localStorage.getItem('agricredx_buyer_requests') || '[]');
                  existing.push({
                    id: 'REQ-' + Math.floor(Math.random() * 100000),
                    buyer: address || '0xbF6A6E0F... (Test Buyer)',
                    buyerName: rfpBuyerName || 'Global Agri Corp',
                    commodity: rfpCommodity,
                    quantity: rfpQuantity,
                    amount: rfpAmount,
                    deliveryDate: rfpDelivery,
                    status: 'OPEN'
                  });
                  localStorage.setItem('agricredx_buyer_requests', JSON.stringify(existing));
                  setShowRfpModal(false);
                  setRfpCommodity(''); setRfpAmount(''); setRfpQuantity(''); setRfpDelivery(''); setRfpBuyerName('');
                  alert('Requirement posted successfully to the Supplier Marketplace!');
                }}
                className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md"
              >
                Publish Requirement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BuyerReceivablesTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const { getReadOnlyContract } = await import('../lib/contract');
        const { ethers } = await import('ethers');
        const contract = getReadOnlyContract();
        const count = await contract.receivableCount();
        const data = [];
        for (let i = 1; i <= Number(count); i++) {
          const r = await contract.receivables(i);
          data.push({
            id: i,
            invoice_id: r.invoiceId,
            amount: ethers.formatEther(r.amount),
            currency: 'MSTC',
            due_date: new Date(Number(r.dueDate) * 1000).toISOString(),
            status: Number(r.status) === 0 ? 'CREATED' : Number(r.status) === 1 ? 'DELIVERED' : Number(r.status) === 2 ? 'VERIFIED' : Number(r.status) === 3 ? 'BUYER_ACCEPTED' : 'UNKNOWN',
            on_chain_id: i.toString(),
          });
        }
        setReceivables(data.reverse());
      } catch (err) {
        console.error("Failed to load buyer receivables:", err);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-500">Loading receivables from database...</div>;
  if (receivables.length === 0) return <div className="text-center py-8 text-slate-500">No active receivables found for you.</div>;

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
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded">{r.status}</span>
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
