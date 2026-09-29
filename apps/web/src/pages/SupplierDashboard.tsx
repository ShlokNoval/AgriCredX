import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract, getReadOnlyContract, getReadOnlyProvider } from '../lib/contract';
import { ethers } from 'ethers';

export default function SupplierDashboard() {
  const { isConnected, signer, address } = useWallet();
  const [buyerAddress, setBuyerAddress] = useState('');
  const [amount, setAmount] = useState('1');
  const [invoiceId, setInvoiceId] = useState('INV-2026-09124');
  const [dueDateDays, setDueDateDays] = useState('60');
  const [originAddress, setOriginAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdReceivable, setCreatedReceivable] = useState<any>(null);

  // Marketplace State
  const [openRequests, setOpenRequests] = useState<any[]>([]);

  // Stats State
  const [activeQuotations, setActiveQuotations] = useState(0);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  // Table refresh key
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  React.useEffect(() => {
    setOpenRequests(JSON.parse(localStorage.getItem('agricredx_buyer_requests') || '[]').filter((r: any) => r.status === 'OPEN'));

    // Fetch Dynamic Stats from Smart Contract
    const fetchStats = async () => {
      try {
        const contract = getReadOnlyContract();
        const count = await contract.receivableCount();
        let quotations = 0;
        let deliveries = 0;
        let earned = 0;
        for (let i = 1; i <= Number(count); i++) {
          const r = await contract.receivables(i);
          const status = Number(r.status);
          if (status === 0) quotations++; // QUOTATION_SENT
          if (status === 2 || status === 3 || status === 4) deliveries++; // DOCS UPLOADED, PACKED, IN_TRANSIT
          if (status === 5) earned += Number(ethers.formatEther(r.amount)); // DELIVERED
        }
        setActiveQuotations(quotations);
        setActiveDeliveries(deliveries);
        setTotalEarned(earned);
      } catch (err) {
        console.error("Failed to fetch dynamic stats", err);
      }
    };
    fetchStats();
  }, [tableRefreshKey]);

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setTxHash(null);
    try {
      if (!signer) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      const contract = getAgriCredXContract(signer);

      const parsedAmount = ethers.parseEther(amount);
      const dueDateTimestamp = Math.floor(Date.now() / 1000) + (parseInt(dueDateDays) * 24 * 60 * 60);

      console.log("Creating receivable with invoice ID:", invoiceId);
      const invoiceDocUri = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
      const tx = await contract.createReceivable(invoiceId, buyerAddress, parsedAmount, dueDateTimestamp, invoiceDocUri);
      setTxHash(tx.hash);

      let receipt = null;
      let newReceivableId = null;
      try {
        receipt = await tx.wait(); // Wait for confirmation
        console.log("Transaction confirmed!");
        // Look for ReceivableCreated event
        const iface = new ethers.Interface(contract.interface.fragments);
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
      } catch (waitErr: any) {
        console.warn("tx.wait() threw an error (likely 429 rate limit). Approximating ID.", waitErr);
        await new Promise(res => setTimeout(res, 4000));
        // Fallback: get the latest ID directly from the contract
        const count = await contract.receivableCount();
        newReceivableId = count;
      }

      if (newReceivableId) {
        try {
          if (originAddress) {
            await fetch('/api/set-address', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ txId: newReceivableId.toString(), originAddress })
            });
          }
        } catch (e) {
          console.error("Failed to save origin address", e);
        }

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
      setTableRefreshKey(k => k + 1); // Refresh the table
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
          <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
        </div>
      </div>

      {!isConnected && (
        <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl text-amber-800 font-medium flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" /></svg>
          Please connect your BridgeKey wallet to interact with your receivables.
        </div>
      )}

      {/* Supplier Analytics Widget */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center shadow-sm">
            <div className="p-3 bg-red-50 text-red-700 rounded-lg mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Quotations</p>
              <p className="text-2xl font-bold text-slate-900">{activeQuotations}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Deliveries</p>
              <p className="text-2xl font-bold text-slate-900">{activeDeliveries}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center shadow-sm">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Earned</p>
              <p className="text-2xl font-bold text-slate-900">{totalEarned} MSTC</p>
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
                          alert(`Order for "${req.quantity} ${req.commodity}" from ${req.buyerName} selected!\n\nQuotation ID: INV-${req.id}\nAmount: ${req.amount} MSTC\nDue in: ${diffDays} days\n\nScroll down and click "Send Quotation" to propose it on-chain.`);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm text-xs"
                      >
                        Send Quotation
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
            <h2 className="text-lg font-semibold text-slate-800">Send Quotation / Proposal</h2>
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Origin Address (Shipping From)</label>
                <textarea
                  required
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  placeholder="e.g. Warehouse 4, AgriPark, Pune, Maharashtra"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !buyerAddress || !amount || !invoiceId || !dueDateDays}
                className="px-6 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Confirming on Chain...' : 'Send Quotation'}
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
                    <li><strong>Status:</strong> <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold">{createdReceivable.status}</span></li>
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
          <button onClick={() => setTableRefreshKey(k => k + 1)} className="text-sm text-red-700 hover:text-red-800 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Data
          </button>
        </div>
        <div className="p-6">
          <SupplierReceivablesTable signer={signer} refreshKey={tableRefreshKey} onUploaded={() => setTableRefreshKey(k => k + 1)} />
        </div>
      </div>
    </div>
  );
}

/** Compute SHA-256 hash of file bytes, returns 0x-prefixed hex string */
async function hashFileBytes(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  'QUOTATION_SENT': { label: 'QUOTATION SENT', color: 'bg-amber-100 text-amber-800' },
  'BUYER_ACCEPTED': { label: 'BUYER ACCEPTED', color: 'bg-emerald-100 text-emerald-800' },
  'DOCUMENTATION_UPLOADED': { label: 'DOCS UPLOADED', color: 'bg-red-100 text-red-800' },
  'PACKED': { label: 'PACKED', color: 'bg-violet-100 text-violet-800' },
  'IN_TRANSIT': { label: 'IN TRANSIT', color: 'bg-orange-100 text-orange-800' },
  'DELIVERED': { label: 'DELIVERED', color: 'bg-emerald-200 text-emerald-900' },
  'UNKNOWN': { label: 'UNKNOWN', color: 'bg-slate-100 text-slate-800' },
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

function SupplierReceivablesTable({ signer, refreshKey, onUploaded }: { signer: ethers.JsonRpcSigner | null; refreshKey: number; onUploaded: () => void }) {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null); // tracks which ID is uploading
  const [uploadResult, setUploadResult] = useState<{ id: string; hash: string; txHash: string } | null>(null);

  // Verify document hash state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ id: string; match: boolean; fileHash: string; chainHash: string } | null>(null);

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
          let originAddress = null;
          let deliveryAddress = null;
          try {
            const res = await fetch(`/api/get-address?txId=${i}`);
            const json = await res.json();
            originAddress = json.originAddress;
            deliveryAddress = json.deliveryAddress;
          } catch (e) {}

          data.push({
            id: i,
            invoice_id: r.invoiceId,
            amount: ethers.formatEther(r.amount),
            currency: 'MSTC',
            due_date: new Date(Number(r.dueDate) * 1000).toISOString(),
            status: statusFromEnum(Number(r.status)),
            statusNum: Number(r.status),
            on_chain_id: i.toString(),
            attestation_digest: r.attestationDigest,
            originAddress,
            deliveryAddress
          });
        }
        setReceivables(data.reverse());
      } catch (err) {
        console.error("Failed to load receivables from blockchain:", err);
      }
      setLoading(false);
    }
    loadData();
  }, [refreshKey]);

  const [selectedDocs, setSelectedDocs] = useState<Record<string, { po?: File, invoice?: File, qa?: File }>>({});

  const handleUploadDocs = async (id: string, files: File[]) => {
    try {
      if (!signer) {
        alert("Wallet not connected. Please connect your wallet first.");
        return;
      }
      if (files.length !== 3) {
        alert("Please select exactly 3 documents: Invoice, PO, and Quality Assurance Certificate.");
        return;
      }
      setIsUploading(id);

      // Sort files by name to ensure consistent hashing regardless of selection order
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

      const digest = ethers.keccak256(allBytes);

      const contract = getAgriCredXContract(signer);
      
      // Check current status before sending tx to avoid confusing gas estimation errors
      const currentR = await contract.receivables(id);
      if (Number(currentR.status) !== 1) {
        alert("Documents for this receivable have already been uploaded or the status has changed! Refreshing the page.");
        onUploaded();
        setIsUploading(null);
        return;
      }

      const tx = await contract.uploadDocumentation(id, digest);
      try {
        await tx.wait();
      } catch (waitErr: any) {
        console.warn("tx.wait() rate limited. Ignoring.", waitErr);
        await new Promise(res => setTimeout(res, 3000));
      }

      setUploadResult({ id, hash: digest, txHash: tx.hash });
      console.log(`Documentation anchored on-chain. Digest: ${digest}`);

      // Refresh the table to show updated status
      onUploaded();
    } catch (err: any) {
      console.error("Upload documentation failed:", err);
      alert(err.reason || err.message || "Failed to upload documentation. Ensure wallet is connected and contract ABI is up to date.");
    } finally {
      setIsUploading(null);
    }
  };

  const [verifyDocs, setVerifyDocs] = useState<Record<string, { po?: File, invoice?: File, qa?: File }>>({});

  const handleVerifyDocument = async (id: string, chainDigest: string, files: File[]) => {
    try {
      if (files.length !== 3) {
        alert("Please select exactly 3 documents for verification.");
        return;
      }
      setVerifyingId(id);

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

      const match = computedHash.toLowerCase() === chainDigest.toLowerCase();
      setVerifyResult({ id, match, fileHash: computedHash, chainHash: chainDigest });
    } catch (err) {
      console.error("Verification failed:", err);
      alert("Failed to verify document hash.");
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-500">Loading receivables from database...</div>;
  if (receivables.length === 0) return <div className="text-center py-8 text-slate-500">No active receivables found. Create one above!</div>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Transaction Ref</th>
              <th className="px-4 py-3">Quotation / Invoice</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">On-Chain ID</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((r) => {
              const statusInfo = STATUS_MAP[r.status] || STATUS_MAP['UNKNOWN'];
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">REC-2026-000{r.on_chain_id || 'X'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.invoice_id}</p>
                    {(() => {
                      let commodity = '';
                      try {
                        const reqStr = localStorage.getItem('agricredx_buyer_requests');
                        if (reqStr) {
                          const reqs = JSON.parse(reqStr);
                          const reqId = r.invoice_id.replace('INV-', '');
                          const matchedReq = reqs.find((req: any) => req.id === reqId);
                          if (matchedReq) commodity = matchedReq.quantity + ' ' + matchedReq.commodity;
                        }
                      } catch (e) { }
                      if (!commodity) commodity = 'Agri Product';

                      return (
                        <p className="text-xs text-slate-500 mt-1 font-semibold">{commodity}</p>
                      );
                    })()}
                    {r.originAddress && (
                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] leading-tight text-slate-600">
                        <strong className="text-slate-800 uppercase tracking-wider">Origin (Shipping From)</strong><br />{r.originAddress}
                      </div>
                    )}
                    {r.deliveryAddress && (
                      <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] leading-tight text-slate-600">
                        <strong className="text-slate-800 uppercase tracking-wider">Delivery (Shipping To)</strong><br />{r.deliveryAddress}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">{r.amount} {r.currency}</td>
                  <td className="px-4 py-3">{new Date(r.due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${statusInfo.color}`}>{statusInfo.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.on_chain_id ? `#${r.on_chain_id}` : 'Pending NFT'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      {/* Upload Docs button - only when BUYER_ACCEPTED */}
                      {r.on_chain_id && r.status === 'BUYER_ACCEPTED' && (
                        <div className="flex flex-col gap-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Required Documents for Escrow</div>

                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <div className={`px-2 py-1 rounded border ${selectedDocs[r.on_chain_id]?.po ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                              {selectedDocs[r.on_chain_id]?.po ? '✓ PO Attached' : '+ Attach Purchase Order'}
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setSelectedDocs(prev => ({ ...prev, [r.on_chain_id]: { ...prev[r.on_chain_id], po: file } }));
                            }} />
                          </label>

                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <div className={`px-2 py-1 rounded border ${selectedDocs[r.on_chain_id]?.invoice ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                              {selectedDocs[r.on_chain_id]?.invoice ? '✓ Invoice Attached' : '+ Attach Invoice'}
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setSelectedDocs(prev => ({ ...prev, [r.on_chain_id]: { ...prev[r.on_chain_id], invoice: file } }));
                            }} />
                          </label>

                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <div className={`px-2 py-1 rounded border ${selectedDocs[r.on_chain_id]?.qa ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                              {selectedDocs[r.on_chain_id]?.qa ? '✓ QA Cert Attached' : '+ Attach QA Certificate'}
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setSelectedDocs(prev => ({ ...prev, [r.on_chain_id]: { ...prev[r.on_chain_id], qa: file } }));
                            }} />
                          </label>

                          <button
                            disabled={!(selectedDocs[r.on_chain_id]?.po && selectedDocs[r.on_chain_id]?.invoice && selectedDocs[r.on_chain_id]?.qa) || isUploading === r.on_chain_id}
                            onClick={() => {
                              const docs = selectedDocs[r.on_chain_id];
                              if (docs.po && docs.invoice && docs.qa) {
                                handleUploadDocs(r.on_chain_id, [docs.po, docs.invoice, docs.qa] as any);
                              }
                            }}
                            className="mt-1 bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
                          >
                            {isUploading === r.on_chain_id ? 'Hashing & Anchoring...' : 'Submit & Hash Documents'}
                          </button>
                        </div>
                      )}

                      {/* Verify Document Hash - after docs uploaded */}
                      {r.on_chain_id && r.statusNum >= 2 && r.attestation_digest && r.attestation_digest !== ethers.ZeroHash && (
                        <div className="flex flex-col gap-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Verify On-Chain Hash</div>

                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <div className={`px-2 py-1 rounded border ${verifyDocs[r.on_chain_id]?.po ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                              {verifyDocs[r.on_chain_id]?.po ? '✓ PO Attached' : '+ Select PO'}
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setVerifyDocs(prev => ({ ...prev, [r.on_chain_id]: { ...prev[r.on_chain_id], po: file } }));
                            }} />
                          </label>

                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <div className={`px-2 py-1 rounded border ${verifyDocs[r.on_chain_id]?.invoice ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                              {verifyDocs[r.on_chain_id]?.invoice ? '✓ Invoice Attached' : '+ Select Invoice'}
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setVerifyDocs(prev => ({ ...prev, [r.on_chain_id]: { ...prev[r.on_chain_id], invoice: file } }));
                            }} />
                          </label>

                          <label className="text-xs flex items-center gap-2 cursor-pointer">
                            <div className={`px-2 py-1 rounded border ${verifyDocs[r.on_chain_id]?.qa ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                              {verifyDocs[r.on_chain_id]?.qa ? '✓ QA Cert Attached' : '+ Select QA Certificate'}
                            </div>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setVerifyDocs(prev => ({ ...prev, [r.on_chain_id]: { ...prev[r.on_chain_id], qa: file } }));
                            }} />
                          </label>

                          <button
                            disabled={!(verifyDocs[r.on_chain_id]?.po && verifyDocs[r.on_chain_id]?.invoice && verifyDocs[r.on_chain_id]?.qa) || verifyingId === r.on_chain_id}
                            onClick={() => {
                              const docs = verifyDocs[r.on_chain_id];
                              if (docs.po && docs.invoice && docs.qa) {
                                handleVerifyDocument(r.on_chain_id, r.attestation_digest, [docs.po, docs.invoice, docs.qa] as any);
                              }
                            }}
                            className="mt-1 bg-slate-100 text-slate-700 text-xs font-bold py-1.5 px-3 rounded hover:bg-rose-50 hover:text-rose-600 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
                          >
                            {verifyingId === r.on_chain_id ? 'Verifying...' : 'Verify Combine Hash'}
                          </button>
                        </div>
                      )}

                      {/* Print QR - after docs uploaded and during logistics */}
                      {r.on_chain_id && (r.status === 'DOCUMENTATION_UPLOADED' || r.status === 'PACKED' || r.status === 'IN_TRANSIT') && (
                        <button
                          onClick={() => {
                            const baseUrl = window.location.origin;
                            const url = `${baseUrl}/delivery/${r.on_chain_id}?hash=${r.attestation_digest || 'unsigned'}`;
                            window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank', 'width=400,height=400');
                          }}
                          className="flex items-center text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded hover:bg-red-50 hover:text-red-700 transition-colors border border-slate-200"
                          title="Generate QR code for physical logistics"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                          Print QR
                        </button>
                      )}

                      {/* View NFT Certificate - after docs uploaded */}
                      {r.on_chain_id && r.statusNum >= 2 && (
                        <button
                          onClick={() => {
                            const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
                            const url = `${baseUrl}/certificate/${r.on_chain_id}`;
                            window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank', 'width=400,height=400');
                            // Also open the actual certificate in a new tab
                            window.open(`/certificate/${r.on_chain_id}`, '_blank');
                          }}
                          className="flex items-center text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors border border-emerald-200 font-semibold"
                          title="Generate QR code linking to the public NFT certificate"
                        >
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          View NFT Cert (QR)
                        </button>
                      )}
                    </div>

                    {/* Logistics Proofs and GRN */}
                    {r.on_chain_id && r.statusNum >= 3 && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3">
                        <button
                          onClick={async () => {
                            let proofs = [];
                            try {
                              const res = await fetch(`/api/get-proofs?id=${r.on_chain_id}`);
                              const data = await res.json();
                              const phases = [3, 4, 5];
                              proofs = phases.map(p => ({
                                phase: p,
                                data: data[p] || localStorage.getItem(`deliveryProof_${r.on_chain_id}_${p}`)
                              })).filter(p => p.data);
                            } catch (err) {
                              console.error("Failed to fetch proofs", err);
                            }

                            if (proofs.length === 0) {
                              alert("No photographic proof was uploaded during logistics scanning.");
                              return;
                            }

                            // Open a new window with a simple HTML gallery
                            const win = window.open("", "_blank");
                            if (win) {
                              win.document.write(`
                                <html>
                                <head>
                                  <title>Delivery Proof - ${r.invoice_id}</title>
                                  <style>
                                    body { font-family: sans-serif; padding: 20px; background: #f8fafc; }
                                    .card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center; }
                                    img { max-width: 100%; max-height: 70vh; border-radius: 4px; border: 1px solid #e2e8f0; }
                                    h2 { color: #0f172a; margin-top: 0; }
                                    .phase-3 { color: #b45309; }
                                    .phase-4 { color: #4338ca; }
                                    .phase-5 { color: #047857; }
                                  </style>
                                </head>
                                <body>
                                  <h1>Logistics Proof: ${r.invoice_id}</h1>
                                  ${proofs.map(p => `
                                    <div class="card">
                                      <h2 class="phase-${p.phase}">
                                        ${p.phase === 3 ? '📦 Packed & Ready' : p.phase === 4 ? '🚚 In Transit' : '✅ Delivered to Buyer'}
                                      </h2>
                                      <img src="${p.data}" alt="Proof Photo" />
                                    </div>
                                  `).join('')}
                                </body>
                                </html>
                              `);
                              win.document.close();
                            }
                          }}
                          className="flex items-center text-xs bg-red-50 text-red-800 px-3 py-1.5 rounded hover:bg-red-100 transition-colors border border-red-200 font-semibold"
                        >
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          View Delivery Proofs
                        </button>

                        {r.statusNum >= 5 && localStorage.getItem(`grn_generated_${r.on_chain_id}`) && (
                          <button
                            onClick={() => {
                              const win = window.open("", "_blank");
                              const timestamp = localStorage.getItem(`grn_generated_${r.on_chain_id}`);
                              const dateStr = new Date(timestamp as string).toLocaleString();
                              if (win) {
                                win.document.write(`
                                  <html>
                                  <head>
                                    <title>Goods Received Note (GRN) - ${r.invoice_id}</title>
                                    <style>
                                      body { font-family: 'Courier New', Courier, monospace; padding: 40px; background: #fff; color: #000; }
                                      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
                                      .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                                      .meta { margin-bottom: 30px; }
                                      table { w-full; border-collapse: collapse; margin-top: 20px; width: 100%; }
                                      th, td { border: 1px solid #000; padding: 10px; text-align: left; }
                                      .seal { margin-top: 50px; text-align: right; font-weight: bold; color: #047857; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <div class="title">GOODS RECEIVED NOTE (GRN)</div>
                                      <div>AUTO-GENERATED ON-CHAIN RECEIPT</div>
                                    </div>
                                    <div class="meta">
                                      <p><strong>Invoice ID:</strong> ${r.invoice_id}</p>
                                      <p><strong>On-Chain Asset ID:</strong> #${r.on_chain_id}</p>
                                      <p><strong>Date Received:</strong> ${dateStr}</p>
                                      <p><strong>Status:</strong> VERIFIED & DELIVERED</p>
                                    </div>
                                    <table>
                                      <tr>
                                        <th>Description</th>
                                        <th>Amount Settled</th>
                                        <th>Cryptographic Integrity</th>
                                      </tr>
                                      <tr>
                                        <td>Goods delivered matching ${r.invoice_id} requirements</td>
                                        <td>${r.amount} ${r.currency}</td>
                                        <td style="word-break: break-all;">${r.attestation_digest}</td>
                                      </tr>
                                    </table>
                                    <div class="seal">
                                      ✓ ESCROW RELEASED<br/>
                                      AgriCredX Verified
                                    </div>
                                    <div style="margin-top: 40px; text-align: center;">
                                      <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print GRN</button>
                                    </div>
                                  </body>
                                  </html>
                                `);
                                win.document.close();
                              }
                            }}
                            className="flex items-center justify-center text-xs bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors font-bold shadow-md"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Download GRN
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Success Confirmation */}
      {uploadResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="space-y-1">
              <p className="font-semibold text-emerald-900">Document Hashed & Anchored On-Chain (Receivable #{uploadResult.id})</p>
              <p className="text-xs text-emerald-700"><strong>Attestation Digest:</strong> <span className="font-mono break-all">{uploadResult.hash}</span></p>
              <p className="text-xs text-emerald-700"><strong>TX Hash:</strong> <span className="font-mono break-all">{uploadResult.txHash}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Verify Result */}
      {verifyResult && (
        <div className={`p-4 border rounded-xl animate-fade-in ${verifyResult.match ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start">
            {verifyResult.match ? (
              <svg className="w-5 h-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <div className="space-y-1">
              <p className={`font-semibold ${verifyResult.match ? 'text-emerald-900' : 'text-red-900'}`}>
                {verifyResult.match ? '✓ HASH MATCH — Document Integrity Verified' : '✗ HASH MISMATCH — Document Tampered or Different File'}
              </p>
              <p className="text-xs text-slate-700"><strong>File Hash:</strong> <span className="font-mono break-all">{verifyResult.fileHash}</span></p>
              <p className="text-xs text-slate-700"><strong>On-Chain Hash:</strong> <span className="font-mono break-all">{verifyResult.chainHash}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
