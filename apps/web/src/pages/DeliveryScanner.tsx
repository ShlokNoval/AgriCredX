import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { getAgriCredXContract } from '../lib/contract';
import { CheckCircle, Truck, ShieldAlert, QrCode } from 'lucide-react';

export default function DeliveryScanner() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hashParam = searchParams.get('hash');
  
  const [pin, setPin] = useState('');
  const [logisticsPhase, setLogisticsPhase] = useState('1'); // Default to PACKED
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState('');

  const handleUpdateStatus = async () => {
    if (!id || pin.length < 4) return;
    setIsSubmitting(true);
    setStatus('IDLE');
    setError('');

    try {
      // Import ethers and get local provider
      const { ethers } = await import('ethers');
      const { getReadOnlyProvider, getAgriCredXContract } = await import('../lib/contract');
      const provider = getReadOnlyProvider();
      
      // We use the first Hardhat account to execute this proxy transaction
      const localSigner = await provider.getSigner(0);
      const contract = getAgriCredXContract(localSigner);
      
      // Call the updateLogisticsStatus function on the blockchain
      // 1 = PACKED, 2 = IN_TRANSIT, 3 = DELIVERED
      const tx = await contract.updateLogisticsStatus(id, Number(logisticsPhase));
      await tx.wait();
      setStatus('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setError(err.reason || err.message || 'Transaction failed');
      setStatus('ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden">
        
        {/* Top visual decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

        <div>
          <div className="mx-auto h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 shadow-sm border border-blue-100">
            <QrCode size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Order Delivery
          </h2>
          <p className="mt-3 text-slate-600 font-medium">
            Scanned Asset ID: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">#{id}</span>
          </p>
        </div>

        {/* Security Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left flex items-start gap-3">
          <ShieldAlert className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-1">Warehouse Authorization</p>
            <p>
              Please enter your 4-digit Warehouse PIN to confirm this delivery.
              The cryptographic signature (`{hashParam ? hashParam.substring(0,10)+'...' : 'missing'}`) will be sent to the blockchain automatically.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {status === 'SUCCESS' ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-xl flex flex-col items-center">
              <CheckCircle size={48} className="mb-3 text-emerald-500" />
              <p className="font-bold text-lg">Status Updated!</p>
              <p className="text-sm mt-1 text-emerald-600">The blockchain state has been updated successfully.</p>
            </div>
          ) : (
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select New Phase</label>
                  <select 
                    value={logisticsPhase}
                    onChange={(e) => setLogisticsPhase(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 font-medium"
                  >
                    <option value="1">📦 Packed & Ready</option>
                    <option value="2">🚚 In Transit</option>
                    <option value="3">✅ Delivered to Buyer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Warehouse PIN</label>
                  <input
                    type="password"
                    placeholder="Enter 4-Digit PIN"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-2xl tracking-widest py-3 px-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
              
              <button
                onClick={handleUpdateStatus}
                disabled={isSubmitting || pin.length < 4}
                className="w-full flex items-center justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                <Truck className="mr-2" size={24} />
                {isSubmitting ? 'Updating Chain...' : 'Update Status'}
              </button>
              {status === 'ERROR' && (
                <p className="text-red-500 text-sm font-medium mt-2">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
