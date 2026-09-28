import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract } from '../lib/contract';
import { ethers } from 'ethers';

export default function SupplierDashboard() {
  const { isConnected, signer, address } = useWallet();
  const [buyerAddress, setBuyerAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'); // default hardhat acct 2
  const [amount, setAmount] = useState('850000');
  const [invoiceId, setInvoiceId] = useState('INV-2026-09124');
  const [dueDateDays, setDueDateDays] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdReceivable, setCreatedReceivable] = useState<any>(null);
  
  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;
    
    setIsSubmitting(true);
    setTxHash(null);
    try {
      const contract = getAgriCredXContract(signer);
      
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
         // Read back the state from the contract
         const receivableData = await contract.receivables(newReceivableId);
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

      {isConnected && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Create New Receivable</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (INR equivalent)</label>
                <input 
                  type="number"
                  required
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 850000"
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
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Your Active Receivables</h2>
        </div>
        <div className="p-6 min-h-[200px] flex items-center justify-center">
          <p className="text-slate-400">Database integration pending Phase 3.</p>
        </div>
      </div>
    </div>
  );
}
