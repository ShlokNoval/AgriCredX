import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncWalletAddress = async (walletAddr: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ wallet_address: walletAddr }).eq('id', user.id);
      }
    } catch (e) { console.error(e); }
  };

  // Check if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      // Typically BridgeKey or MetaMask injects into window.ethereum
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await browserProvider.send("eth_accounts", []);
          
          if (accounts.length > 0) {
            const activeSigner = await browserProvider.getSigner();
            setAddress(accounts[0]);
            setProvider(browserProvider);
            setSigner(activeSigner);
            syncWalletAddress(accounts[0]);
          }
        } catch (err: any) {
          console.error("Failed to check wallet connection:", err);
        }
      }
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          const activeSigner = await browserProvider.getSigner();
          const address = accounts[0];
          setAddress(address);
          setProvider(browserProvider);
          setSigner(activeSigner);
          syncWalletAddress(address);
          
          // AUTO-FAUCET FOR LOCAL DEMO
          try {
             const network = await browserProvider.getNetwork();
             if (network.chainId === 31337n) { // Hardhat
               const localRpc = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
               const richSigner = await localRpc.getSigner(0);
               const bal = await localRpc.getBalance(address);
               if (bal < ethers.parseEther("10")) {
                 console.log("Auto-funding wallet from local faucet...");
                 await richSigner.sendTransaction({ to: address, value: ethers.parseEther("100") });
               }
             }
          } catch (e) {
             console.log("Auto-faucet skipped", e);
          }
          return;
        }
      } 
      
      // FALLBACK FOR LOCAL SMOKE TEST (NO EXTENSION)
      console.warn("No Web3 wallet detected. Falling back to local Hardhat node for smoke testing.");
      const rpcUrl = import.meta.env.VITE_LOCAL_RPC_URL || "http://127.0.0.1:8545";
      const localProvider = new ethers.JsonRpcProvider(rpcUrl);
      const activeSigner = await localProvider.getSigner(1); // Use Account 1 as Supplier
      const address = await activeSigner.getAddress();
      
      setAddress(address);
      setProvider(localProvider as any);
      setSigner(activeSigner as any);
      
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
  };

  return (
    <WalletContext.Provider 
      value={{ 
        address, 
        isConnected: !!address, 
        isConnecting, 
        provider, 
        signer, 
        connectWallet,
        disconnectWallet,
        error
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
