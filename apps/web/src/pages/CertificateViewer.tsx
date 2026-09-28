import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReadOnlyContract } from '../lib/contract';
import { ethers } from 'ethers';

const STATUS_MAP: Record<number, string> = {
  0: 'QUOTATION SENT', 1: 'BUYER ACCEPTED', 2: 'DOCUMENTATION UPLOADED',
  3: 'PACKED', 4: 'IN TRANSIT', 5: 'DELIVERED',
  6: 'VERIFIED', 7: 'ATTESTED', 8: 'FINANCEABLE',
  9: 'FUNDED', 10: 'OUTSTANDING', 11: 'REPAID', 12: 'CLOSED', 13: 'DISPUTED',
};

export default function CertificateViewer() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const contract = getReadOnlyContract();
        const r = await contract.receivables(id);
        
        if (Number(r.amount) === 0) {
          throw new Error('Certificate not found on-chain');
        }

        setData({
          id,
          invoiceId: r.invoiceId,
          amount: ethers.formatEther(r.amount),
          buyer: r.buyer,
          supplier: r.supplier,
          dueDate: new Date(Number(r.dueDate) * 1000).toLocaleDateString(),
          status: STATUS_MAP[Number(r.status)] || 'UNKNOWN',
          attestationDigest: r.attestationDigest
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load certificate');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Certificate Not Found</h1>
          <p className="text-slate-500 mb-6">{error || 'This asset could not be found on the blockchain.'}</p>
          <Link to="/" className="inline-block px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      
      {/* Certificate Container */}
      <div className="max-w-3xl w-full bg-white relative p-1 sm:p-2 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Decorative Border */}
        <div className="absolute inset-0 border-[12px] sm:border-[20px] border-emerald-900/10 pointer-events-none rounded-xl"></div>
        <div className="absolute inset-2 border-2 border-emerald-800/20 pointer-events-none rounded-lg"></div>

        <div className="bg-white px-8 py-12 sm:px-16 sm:py-16 relative">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mb-6 border border-emerald-200 shadow-sm">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight uppercase" style={{ fontFamily: 'Georgia, serif' }}>
              Digital Asset Certificate
            </h1>
            <p className="text-lg text-emerald-700 mt-3 font-semibold tracking-wide uppercase">
              AgriCredX Blockchain Escrow Network
            </p>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <p className="text-slate-500 text-sm uppercase tracking-widest font-bold mb-1">On-Chain Token ID</p>
              <p className="text-3xl font-mono text-slate-900">#{data.id}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-y border-slate-100 py-8">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Supplier / Issuer</p>
                <p className="text-slate-800 font-mono text-sm break-all">{data.supplier}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Buyer / Beneficiary</p>
                <p className="text-slate-800 font-mono text-sm break-all">{data.buyer}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pb-8 border-b border-slate-100">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Invoice Ref</p>
                <p className="text-slate-800 font-semibold">{data.invoiceId}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Asset Value</p>
                <p className="text-emerald-700 font-bold">{data.amount} MSTC</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Current Status</p>
                <p className="text-slate-800 font-semibold">{data.status}</p>
              </div>
            </div>

            {/* Cryptographic Hash Section */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-center text-slate-800 font-bold mb-4 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                Cryptographic Attestation Hash
              </h3>
              
              {data.attestationDigest && data.attestationDigest !== ethers.ZeroHash ? (
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">This is the immutable SHA-256 (keccak256) digest of the physical supply chain documents.</p>
                  <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-sm sm:text-base break-all shadow-inner border border-slate-700">
                    {data.attestationDigest}
                  </div>
                </div>
              ) : (
                <div className="text-center text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="font-semibold text-sm">Pending Document Upload</p>
                  <p className="text-xs mt-1">The supplier has not yet anchored the document hash on-chain.</p>
                </div>
              )}
            </div>

          </div>

          {/* Footer Ribbon */}
          <div className="mt-12 text-center text-xs text-slate-400">
            <p>This certificate guarantees the authenticity of the digital asset anchored on the MST Blockchain.</p>
            <p className="mt-1">Generated by AgriCredX Protocol</p>
          </div>

        </div>
      </div>
    </div>
  );
}
