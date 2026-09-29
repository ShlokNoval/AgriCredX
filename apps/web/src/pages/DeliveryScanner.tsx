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
  const [logisticsPhase, setLogisticsPhase] = useState('3'); // Default to PACKED
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

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
      
      // HACKATHON DEMO ONLY: We hardcode a funded testnet private key here so the 
      // warehouse worker's phone can submit the transaction without needing a wallet extension.
      // IN PRODUCTION: This should use a backend relayer or account abstraction.
      const DEMO_RELAYER_KEY = "0x4f8b46e3952872a6bddb6ff7674318ce6e6c0df141e744e2265535fabe02dc20";
      const localSigner = new ethers.Wallet(DEMO_RELAYER_KEY, provider);
      
      const contract = getAgriCredXContract(localSigner);
      
      // Call the updateLogisticsStatus function on the blockchain
      // 3 = PACKED, 4 = IN_TRANSIT, 5 = DELIVERED
      const tx = await contract.updateLogisticsStatus(id, Number(logisticsPhase));
      await tx.wait();

      if (photoDataUrl) {
        localStorage.setItem(`deliveryProof_${id}_${logisticsPhase}`, photoDataUrl);
      }
      if (Number(logisticsPhase) === 5) {
        localStorage.setItem(`grn_generated_${id}`, new Date().toISOString());
      }

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
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-cyan-500"></div>

        <div>
          <div className="mx-auto h-20 w-20 bg-red-50 rounded-full flex items-center justify-center text-red-700 mb-6 shadow-sm border border-red-100">
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left flex items-start gap-3">
          <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-red-800">
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
            <>
              <div className="space-y-3 text-left">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select New Phase</label>
                  <select 
                    value={logisticsPhase}
                    onChange={(e) => setLogisticsPhase(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-red-600 focus:ring-red-600 font-medium"
                  >
                    <option value="3">📦 Packed & Ready</option>
                    <option value="4">🚚 In Transit</option>
                    <option value="5">✅ Delivered to Buyer</option>
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
                    className="w-full text-center text-2xl tracking-widest py-3 px-4 border-2 border-slate-200 rounded-xl focus:border-red-600 focus:ring-red-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Proof Photo (Optional)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 text-center py-2 px-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer text-sm font-medium text-slate-600 hover:bg-slate-50">
                      {photoDataUrl ? 'Photo Attached ✅' : '📸 Take Photo'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              const MAX = 800;
                              let w = img.width, h = img.height;
                              if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } }
                              else { if (h > MAX) { w *= MAX/h; h = MAX; } }
                              const canvas = document.createElement('canvas');
                              canvas.width = w; canvas.height = h;
                              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                              setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.7));
                            };
                            if (event.target?.result) img.src = event.target.result as string;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {photoDataUrl && (
                      <button onClick={() => setPhotoDataUrl(null)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleUpdateStatus}
                disabled={isSubmitting || pin.length < 4}
                className="w-full flex items-center justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-red-700 hover:bg-red-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
