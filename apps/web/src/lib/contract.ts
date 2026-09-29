import { ethers } from 'ethers';
import AgriCredXArtifact from './AgriCredX.json';

// Get contract address from environment variable (Vite injects VITE_ prefixed vars)
// In a real deployed app, this comes from the `.env` file generated during deploy.
export const CONTRACT_ADDRESS = import.meta.env.VITE_AGRICREDX_CONTRACT_ADDRESS || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';

export const AgriCredXABI = AgriCredXArtifact.abi;

/**
 * Returns a provider that ALWAYS points to the local Hardhat node via the /rpc proxy.
 * This is used exclusively for READ operations (view/pure calls) so that all clients
 * (desktop with BridgeKey, mobile without wallet) read from the same chain where the
 * contract is deployed and where the mobile delivery scanner writes to.
 * 
 * NOTE: The /rpc path is proxied through Vite → localhost:8545 (Hardhat).
 *       Ngrok exposes this so mobile devices can reach it too.
 */
export function getReadOnlyProvider(): ethers.Provider {
  // 1. If wallet exists (BridgeKey/MetaMask), use it so we read from the same network we write to (MST Testnet)
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  
  // 2. Fallback to MST Testnet RPC for mobile devices without a wallet
  const rpcUrl = import.meta.env.VITE_LOCAL_RPC_URL || 'https://testnetrpc.mstblockchain.com';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Returns a read-only contract instance connected to the local Hardhat node.
 * Use this for all view/pure calls (receivableCount, receivables, etc.)
 */
export function getReadOnlyContract(): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESS, AgriCredXABI, getReadOnlyProvider());
}

/**
 * Creates an ethers Contract instance connected to either a read-only provider
 * or a signer (for write operations like createReceivable, markDelivered, etc.)
 */
export function getAgriCredXContract(providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, AgriCredXABI, providerOrSigner);
}
