import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract, getReadOnlyContract, getReadOnlyProvider } from '../lib/contract';
import { ethers } from 'ethers';
import { PlusCircle } from 'lucide-react';

/** Compute SHA-256 hash of file bytes, returns 0x-prefixed hex string */
async function hashFileBytes(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'QUOTATION_SENT':          { label: 'QUOTATION SENT',          color: 'text-amber-800',    bg: 'bg-amber-100' },
  'BUYER_ACCEPTED':          { label: 'BUYER ACCEPTED',          color: 'text-emerald-800',  bg: 'bg-emerald-100' },
  'DOCUMENTATION_UPLOADED':  { label: 'DOCS UPLOADED',           color: 'text-red-800',     bg: 'bg-red-100' },
  'PACKED':                  { label: 'PACKED',                  color: 'text-violet-800',   bg: 'bg-violet-100' },
  'IN_TRANSIT':              { label: 'IN TRANSIT',              color: 'text-orange-800',   bg: 'bg-orange-100' },
  'DELIVERED':               { label: 'DELIVERED',               color: 'text-emerald-900',  bg: 'bg-emerald-200' },
  'VERIFIED':                { label: 'VERIFIED',                color: 'text-teal-800',     bg: 'bg-teal-100' },
  'ATTESTED':                { label: 'ATTESTED',                color: 'text-cyan-800',     bg: 'bg-cyan-100' },
  'FINANCEABLE':             { label: 'FINANCEABLE',             color: 'text-indigo-800',   bg: 'bg-rose-100' },
  'FUNDED':                  { label: 'FUNDED',                  color: 'text-purple-800',   bg: 'bg-purple-100' },
  'OUTSTANDING':             { label: 'OUTSTANDING',             color: 'text-pink-800',     bg: 'bg-pink-100' },
  'REPAID':                  { label: 'REPAID',                  color: 'text-emerald-900',  bg: 'bg-emerald-200' },
  'CLOSED':                  { label: 'CLOSED',                  color: 'text-slate-800',    bg: 'bg-slate-200' },
  'DISPUTED':                { label: 'DISPUTED',                color: 'text-red-800',      bg: 'bg-red-100' },
};

function statusFromEnum(n: number): string {
  const map: Record<number, string> = {
    0: 'QUOTATION_SENT', 1: 'BUYER_ACCEPTED', 2: 'DOCUMENTATION_UPLOADED',
    3: 'PACKED', 4: 'IN_TRANSIT', 5: 'DELIVERED',
    6: 'VERIFIED', 7: 'ATTESTED', 8: 'FINANCEABLE',
    9: 'FUNDED', 10: 'OUTSTANDING', 11: 'REPAID', 12: 'CLOSED', 13: 'DISPUTED',
  };
  return map[n] || 'UNKNOWN';
}

function getStatusStyle(statusKey: string) {
  return STATUS_MAP[statusKey] || { label: statusKey, color: 'text-slate-800', bg: 'bg-slate-100' };
}

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
  const [pendingReviewCount, setPendingReviewCount] = useState<number>(0);
  const [totalSettled, setTotalSettled] = useState<number>(0);

  // Table refresh key (incremented to force table reload)
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  // Verify document hash state
  const [verifyingDoc, setVerifyingDoc] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ match: boolean; fileHash: string; chainHash: string } | null>(null);

  useEffect(() => {
    const reqs = JSON.parse(localStorage.getItem('agricredx_buyer_requests') || '[]');
    setPostedRequirements(reqs.filter((r: any) => r.buyer === address || !address));
    setOpenRequestsCount(reqs.length);
    // Fetch MSTC Balance from connected wallet
    const fetchBalance = async () => {
      try {
        if (!address) return;
        
        let bal;
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
          bal = await browserProvider.getBalance(address);
        } else {
          const localProvider = getReadOnlyProvider();
          bal = await localProvider.getBalance(address);
        }
        
        setWalletBalance(ethers.formatEther(bal));
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    };
    fetchBalance();

    // Fetch Dynamic Stats from Smart Contract
    const fetchStats = async () => {
      try {
        const contract = getReadOnlyContract();
        const count = await contract.receivableCount();
        let pending = 0;
        let settled = 0;
        for (let i = 1; i <= Number(count); i++) {
          const r = await contract.receivables(i);
          const status = Number(r.status);
          if (status === 0) pending++; // QUOTATION_SENT
          if (status === 5) { // DELIVERED (Escrow paid)
            settled += Number(ethers.formatEther(r.amount));
          }
        }
        setPendingReviewCount(pending);
        setTotalSettled(settled);
      } catch (err) {
        console.error("Failed to fetch dynamic stats", err);
      }
    };
    fetchStats();
  }, [showRfpModal, signer, address, tableRefreshKey]);

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
        supplier: data.supplier,
        status: Number(data.status),
        statusKey: statusFromEnum(Number(data.status)),
        attestationDigest: data.attestationDigest
      });
      setTxHash(null);
      setVerifyResult(null);
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
      if (!signer) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      const contract = getAgriCredXContract(signer);
      const tx = await contract.buyerAccept(activeReceivable.id, { 
        value: ethers.parseEther(activeReceivable.amount.toString()) 
      });
      setTxHash(tx.hash);
      await tx.wait();
      // Refresh both the active receivable details AND the table
      await fetchReceivable();
      setTableRefreshKey(k => k + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.reason || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDocument = async (files: FileList) => {
    if (!activeReceivable || !activeReceivable.attestationDigest) return;
    if (files.length !== 3) {
      alert("Please select exactly 3 documents for verification: Invoice, PO, and Quality Assurance Certificate.");
      return;
    }
    setVerifyingDoc(true);
    try {
      const fileArray = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
      let totalLength = 0;
      const buffers = await Promise.all(fileArray.map(async f => {
        const buf = new Uint8Array(await f.arrayBuffer());
        totalLength += buf.length;
        return buf;
      }));

      const allBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        allBytes.set(buf, offset);
        offset += buf.length;
      }

      const computedHash = ethers.keccak256(allBytes);

      const chainHash = activeReceivable.attestationDigest;
      const match = computedHash.toLowerCase() === chainHash.toLowerCase();
      setVerifyResult({ match, fileHash: computedHash, chainHash });
    } catch (err) {
      console.error("Verification failed:", err);
      alert("Failed to verify document hash.");
    } finally {
      setVerifyingDoc(false);
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
            <div 
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors"
              onClick={() => {
                document.getElementById('receivables-table')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Pending Quotations</h3>
              <p className="text-3xl font-extrabold text-amber-600 mt-2">{pendingReviewCount}</p>
              <p className="text-xs text-amber-600 mt-1">Click to view incoming quotations</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 uppercase">Total Settled (Escrow)</h3>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">{totalSettled} MSTC</p>
              <p className="text-xs text-emerald-600 mt-1">Value of delivered orders</p>
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
              <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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
                {/* Receivable Details Grid */}
                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice ID</p>
                    <p className="font-mono text-slate-800 font-medium">{activeReceivable.invoiceId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</p>
                    <p className="font-bold text-emerald-600">{activeReceivable.amount} MSTC</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</p>
                    {(() => {
                      const style = getStatusStyle(activeReceivable.statusKey);
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${style.bg} ${style.color}`}>
                          {style.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Supplier</p>
                    <p className="font-mono text-xs text-slate-600 truncate">{activeReceivable.supplier}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Buyer</p>
                    <p className="font-mono text-xs text-slate-600 truncate">{activeReceivable.buyer}</p>
                  </div>
                </div>

                {/* Lifecycle Progress Tracker */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Lifecycle Progress</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {['QUOTATION_SENT', 'BUYER_ACCEPTED', 'DOCUMENTATION_UPLOADED', 'PACKED', 'IN_TRANSIT', 'DELIVERED'].map((step, idx) => {
                      const currentIdx = activeReceivable.status;
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      return (
                        <React.Fragment key={step}>
                          <div className={`flex flex-col items-center min-w-[70px] ${isCurrent ? 'scale-105' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                              isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                              isCurrent ? 'bg-white border-emerald-500 text-emerald-600 ring-2 ring-emerald-200' :
                              'bg-slate-100 border-slate-300 text-slate-400'
                            }`}>
                              {isCompleted ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <p className={`text-[9px] mt-1 text-center leading-tight font-medium ${
                              isCurrent ? 'text-emerald-700' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {step.replace(/_/g, ' ').replace('DOCUMENTATION ', 'DOCS ')}
                            </p>
                          </div>
                          {idx < 5 && (
                            <div className={`flex-1 h-0.5 min-w-[12px] ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Acceptance Confirmation (shown after buyer accepted) */}
                {activeReceivable.status >= 1 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <p className="font-semibold text-emerald-900 text-sm">Quotation Accepted — Escrow Locked</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          {activeReceivable.amount} MSTC is locked in the smart contract escrow. 
                          {activeReceivable.status === 1 && ' Waiting for supplier to upload documentation.'}
                          {activeReceivable.status === 2 && ' Supplier has uploaded and hashed documents. Ready for logistics.'}
                          {activeReceivable.status >= 3 && activeReceivable.status <= 4 && ' Order is in the logistics pipeline.'}
                          {activeReceivable.status === 5 && ' Order delivered! Escrow has been released to supplier.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cryptographic Attestation Widget */}
                {activeReceivable.status >= 2 && (
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
                        <p className="text-slate-300 text-xs font-mono">Invoice, PO, QA Certificate Matches Validated</p>
                      </div>
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">On-Chain Document Hash (keccak256)</p>
                      <p className="text-emerald-400 text-xs font-mono truncate">{activeReceivable.attestationDigest}</p>
                    </div>
                    {/* Document Hash Verification */}
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-2">Verify a Supplier Document Against On-Chain Hash</p>
                      <div className="flex gap-2">
                        <label className={`inline-flex items-center text-xs bg-rose-500/20 text-indigo-300 px-3 py-1.5 rounded hover:bg-rose-500/30 transition-colors border border-indigo-500/30 font-semibold cursor-pointer ${verifyingDoc ? 'opacity-50 pointer-events-none' : ''}`}>
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          {verifyingDoc ? 'Verifying...' : 'Upload & Verify Document'}
                          <input 
                            type="file" 
                            multiple
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) handleVerifyDocument(files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        
                        <button 
                          onClick={() => {
                            const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
                            const url = `${baseUrl}/certificate/${activeReceivable.id}`;
                            window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank', 'width=400,height=400');
                            window.open(`/certificate/${activeReceivable.id}`, '_blank');
                          }}
                          className="inline-flex items-center text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded hover:bg-emerald-500/30 transition-colors border border-emerald-500/30 font-semibold"
                          title="Generate QR code linking to the public NFT certificate"
                        >
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          View NFT Cert (QR)
                        </button>
                      </div>
                    </div>
                    {/* Verify Result inline */}
                    {verifyResult && (
                      <div className={`p-3 rounded-lg border ${verifyResult.match ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <p className={`text-xs font-bold mb-1 ${verifyResult.match ? 'text-emerald-400' : 'text-red-400'}`}>
                          {verifyResult.match ? '✓ HASH MATCH — Document Integrity Verified' : '✗ HASH MISMATCH — Document Tampered or Different File'}
                        </p>
                        <p className="text-slate-400 text-[10px] font-mono truncate">File: {verifyResult.fileHash}</p>
                        <p className="text-slate-400 text-[10px] font-mono truncate">Chain: {verifyResult.chainHash}</p>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {activeReceivable.status === 0 /* QUOTATION_SENT */ && (
                    <button 
                      onClick={() => handleAction('ACCEPT')}
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Processing...' : 'Accept Quotation & Lock Escrow'}
                    </button>
                  )}
                  {activeReceivable.status === 1 && (
                    <div className="w-full text-center p-3 text-sm bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-medium">
                      ✓ Quotation Accepted. Awaiting supplier document upload.
                    </div>
                  )}
                  {activeReceivable.status === 2 && (
                    <div className="w-full text-center p-3 text-sm bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
                      📄 Documents Uploaded & Hashed. Awaiting logistics pickup.
                    </div>
                  )}
                  {(activeReceivable.status === 3 || activeReceivable.status === 4) && (
                    <div className="w-full text-center p-3 text-sm bg-orange-50 border border-orange-200 rounded-lg text-orange-700 font-medium">
                      🚚 Order is {activeReceivable.status === 3 ? 'packed and ready for dispatch' : 'in transit to you'}.
                    </div>
                  )}
                  {activeReceivable.status === 5 && (
                    <div className="w-full text-center p-3 text-sm bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium">
                      ✅ Delivered! Escrow of {activeReceivable.amount} MSTC released to supplier.
                    </div>
                  )}
                  {activeReceivable.status > 5 && (
                    <div className="w-full text-center p-3 text-sm text-slate-500 bg-slate-50 rounded-lg">
                      Current state: {statusMap[activeReceivable.status]}
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
        <div id="receivables-table" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Your Actionable Receivables</h2>
            <button onClick={() => setTableRefreshKey(k => k + 1)} className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Data
            </button>
          </div>
          <div className="p-6">
            <BuyerReceivablesTable refreshKey={tableRefreshKey} onSelect={(id: string) => { setReceivableId(id); setTimeout(() => fetchReceivable(), 100); }} />
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
                    buyer: address || 'Anonymous Buyer',
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

function BuyerReceivablesTable({ onSelect, refreshKey }: { onSelect: (id: string) => void; refreshKey: number }) {
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
          const statusKey = statusFromEnum(Number(r.status));
          data.push({
            id: i,
            invoice_id: r.invoiceId,
            amount: ethers.formatEther(r.amount),
            currency: 'MSTC',
            due_date: new Date(Number(r.dueDate) * 1000).toISOString(),
            status: statusKey,
            statusNum: Number(r.status),
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
  }, [refreshKey]);

  if (loading) return <div className="text-center py-8 text-slate-500">Loading receivables from database...</div>;
  if (receivables.length === 0) return <div className="text-center py-8 text-slate-500">No active receivables found for you.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs uppercase bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3">Transaction Ref</th>
            <th className="px-4 py-3">Invoice ID</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((r) => {
            const style = getStatusStyle(r.status);
            return (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">REC-2026-000{r.on_chain_id || 'X'}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{r.invoice_id}</td>
                <td className="px-4 py-3 font-mono">{r.amount} {r.currency}</td>
                <td className="px-4 py-3">{new Date(r.due_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${style.bg} ${style.color}`}>{style.label}</span>
                </td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => onSelect(r.on_chain_id?.toString() || '')}
                    disabled={!r.on_chain_id}
                    className="text-xs bg-slate-900 text-white px-3 py-1 rounded hover:bg-slate-800 disabled:opacity-50"
                  >
                    {r.status === 'QUOTATION_SENT' ? 'Review Quotation' : r.status === 'BUYER_ACCEPTED' ? '✓ Accepted' : `Load ID #${r.on_chain_id || '?'}`}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
