import { ethers } from 'ethers';
import AgriCredXArtifact from './AgriCredX.json';

// Get contract address from environment variable (Vite injects VITE_ prefixed vars)
// In a real deployed app, this comes from the `.env` file generated during deploy.
export const CONTRACT_ADDRESS = import.meta.env.VITE_AGRICREDX_CONTRACT_ADDRESS || '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6';

export const AgriCredXABI = AgriCredXArtifact.abi;

// Local Hardhat RPC — Proxied through Vite so mobile devices (Ngrok) can reach it
const LOCAL_RPC = import.meta.env.VITE_LOCAL_RPC_URL || '/rpc';

/**
 * Returns a read-only provider connected directly to the local Hardhat node.
 * This avoids BridgeKey routing reads to MST Testnet where the contract doesn't exist.
 */
export function getReadOnlyProvider(): ethers.Provider {
  // If a Web3 wallet is available, use it for reads so we are on the same network as writes (e.g. MST Testnet)
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  
  let rpcUrl = LOCAL_RPC;
  // ethers.js requires an absolute URL, so if it's relative like '/rpc', prepend the origin
  if (rpcUrl.startsWith('/')) {
    rpcUrl = `${window.location.origin}${rpcUrl}`;
  }
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
