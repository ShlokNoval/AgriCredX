import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract, getReadOnlyContract, getReadOnlyProvider } from '../lib/contract';
import { ethers } from 'ethers';

export default function SupplierDashboard() {
  const { isConnected, signer, address } = useWallet();
  const [buyerAddress, setBuyerAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'); // default hardhat acct 2
  const [amount, setAmount] = useState('1');
  const [invoiceId, setInvoiceId] = useState('INV-2026-09124');
  const [dueDateDays, setDueDateDays] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdReceivable, setCreatedReceivable] = useState<any>(null);
  
  // Marketplace State
  const [openRequests, setOpenRequests] = useState<any[]>([]);

  React.useEffect(() => {
    setOpenRequests(JSON.parse(localStorage.getItem('agricredx_buyer_requests') || '[]').filter((r: any) => r.status === 'OPEN'));
  }, []);
  
  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setTxHash(null);
    try {
      // Use local Hardhat signer directly — BridgeKey routes to MST Testnet where contract doesn't exist
      const localProvider = getReadOnlyProvider();
      const localSigner = await localProvider.getSigner(0); // Hardhat Account #0 (has funds)
      const contract = getAgriCredXContract(localSigner);
      
      const parsedAmount = ethers.parseEther(amount);
      const dueDateTimestamp = Math.floor(Date.now() / 1000) + (parseInt(dueDateDays) * 24 * 60 * 60);
      
      console.log("Creating receivable with invoice ID:", invoiceId);
      const mockTokenUri = "ipfs://QmMockDocumentHashForNFTCertificate";
      const tx = await contract.createReceivable(invoiceId, buyerAddress, parsedAmount, dueDateTimestamp, mockTokenUri);
      setTxHash(tx.hash);
      
      const receipt = await tx.wait(); // Wait for confirmation
      console.log("Transaction confirmed!");
      
      // Look for ReceivableCreated event
      const iface = new ethers.Interface(contract.interface.fragments);
      let newReceivableId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ReceivableCreated') {
             newReceivableId = parsedLog.args[0]; // id is the first arg
          }
        } catch (e) {
          // Ignore logs not matching our interface
        }
      }

      if (newReceivableId) {
         // Read back the state from the local chain
         const readContract = getReadOnlyContract();
         const receivableData = await readContract.receivables(newReceivableId);
         setCreatedReceivable({
           id: newReceivableId.toString(),
           invoiceId: receivableData.invoiceId,
           amount: ethers.formatEther(receivableData.amount),
           buyer: receivableData.buyer,
           dueDate: receivableData.dueDate.toString(),
           status: Number(receivableData.status) === 0 ? 'CREATED' : 'UNKNOWN'
         });
      }
      
      setBuyerAddress('');
      setAmount('');
      setInvoiceId('');
      setDueDateDays('');
    } catch (err: any) {
      console.error("Failed to create receivable:", err);
      alert(err.reason || err.message || "Transaction failed. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-900 to-cyan-800 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Supplier Dashboard</h1>
          <p className="text-blue-100 mt-2 text-lg">Manage receivables, tokenize invoices, and request financing instantly.</p>
        </div>
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
        </div>
      </div>

      {!isConnected && (
        <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl text-amber-800 font-medium flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>
          Please connect your BridgeKey wallet to interact with your receivables.
        </div>
      )}

      {/* Supplier Analytics Widget */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Financed (YTD)</p>
              <p className="text-2xl font-bold text-slate-900">₹14.2M</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Receivables</p>
              <p className="text-2xl font-bold text-slate-900">3</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center shadow-sm">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Funding Time</p>
              <p className="text-2xl font-bold text-slate-900">2.4 Hrs</p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Marketplace */}
      {isConnected && openRequests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6 animate-fade-in">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Open Buyer Requirements (Marketplace)</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded">RFP Active</span>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-6 py-3">Buyer</th>
                  <th className="px-6 py-3">Commodity & Quantity</th>
                  <th className="px-6 py-3">Budget (MSTC)</th>
                  <th className="px-6 py-3">Delivery Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {openRequests.map((req, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{req.buyerName}</td>
                    <td className="px-6 py-4">{req.quantity} {req.commodity}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{req.amount} MSTC</td>
                    <td className="px-6 py-4">{req.deliveryDate}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          // Auto-fill ALL fields from the selected requirement
                          setBuyerAddress(req.buyer);
                          setAmount(req.amount);
                          // Generate unique Invoice ID from the requirement ID
                          setInvoiceId(`INV-${req.id}`);
                          // Calculate due date days from delivery date
                          const deliveryMs = new Date(req.deliveryDate).getTime();
                          const nowMs = Date.now();
                          const diffDays = Math.max(1, Math.ceil((deliveryMs - nowMs) / (1000 * 60 * 60 * 24)));
                          setDueDateDays(diffDays.toString());
                          alert(`Order for "${req.quantity} ${req.commodity}" from ${req.buyerName} selected!\n\nInvoice ID: INV-${req.id}\nAmount: ${req.amount} MSTC\nDue in: ${diffDays} days\n\nScroll down and click "Create Receivable" to mint it on-chain.`);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm text-xs"
                      >
                        Fulfill Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Create New Receivable / Fulfill Order</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreateReceivable} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice ID</label>
                <input 
                  type="text"
                  required
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="e.g. INV-2026-09124"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Buyer Wallet Address</label>
                <input 
                  type="text"
                  required
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (MSTC)</label>
                <input 
                  type="number"
                  required
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 9"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (Days from now)</label>
                <input 
                  type="number"
                  required
                  value={dueDateDays}
                  onChange={(e) => setDueDateDays(e.target.value)}
                  placeholder="60"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting || !buyerAddress || !amount || !invoiceId || !dueDateDays}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Confirming on Chain...' : 'Create Receivable'}
              </button>
              
              {txHash && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 break-all">
                  Transaction confirmed: {txHash}
                </div>
              )}

              {createdReceivable && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h3 className="font-semibold text-slate-800 mb-2">Read-back from Blockchain:</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li><strong>ID:</strong> {createdReceivable.id}</li>
                    <li><strong>Invoice ID:</strong> {createdReceivable.invoiceId}</li>
                    <li><strong>Amount:</strong> {createdReceivable.amount}</li>
                    <li><strong>Buyer:</strong> {createdReceivable.buyer}</li>
                    <li><strong>Status:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{createdReceivable.status}</span></li>
                  </ul>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Your Active Receivables</h2>
          <button onClick={() => window.location.reload()} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Data
          </button>
        </div>
        <div className="p-6">
          <SupplierReceivablesTable />
        </div>
      </div>
    </div>
  );
}

function SupplierReceivablesTable() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        // Use direct local RPC provider — NOT BridgeKey — for read operations
        const { getReadOnlyContract } = await import('../lib/contract');
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
            status: Number(r.status) === 0 ? 'CREATED' : Number(r.status) === 1 ? 'PACKED' : Number(r.status) === 2 ? 'IN_TRANSIT' : Number(r.status) === 3 ? 'DELIVERED' : Number(r.status) === 4 ? 'VERIFIED' : Number(r.status) === 5 ? 'BUYER_ACCEPTED' : 'UNKNOWN',
            on_chain_id: i.toString(),
            attestation_digest: r.attestationDigest
          });
        }
        setReceivables(data.reverse());
      } catch (err) {
        console.error("Failed to load receivables from blockchain:", err);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-500">Loading receivables from database...</div>;
  if (receivables.length === 0) return <div className="text-center py-8 text-slate-500">No active receivables found. Create one above!</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="text-xs uppercase bg-slate-50 text-slate-700">
          <tr>
            <th className="px-4 py-3">Invoice ID</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">On-Chain ID</th>
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
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">{r.status}</span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{r.on_chain_id ? `#${r.on_chain_id}` : 'Pending NFT'}</td>
              <td className="px-4 py-3">
                {r.on_chain_id && (r.status === 'CREATED' || r.status === 'PACKED' || r.status === 'IN_TRANSIT') && (
                  <button 
                    onClick={() => {
                      const baseUrl = "https://hosea-requisitionary-unawares.ngrok-free.dev";
                      const url = `${baseUrl}/delivery/${r.on_chain_id}?hash=${r.attestation_digest || 'unsigned'}`;
                      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank', 'width=400,height=400');
                    }}
                    className="flex items-center text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200"
                    title="Generate QR code for physical logistics"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    Print QR
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
