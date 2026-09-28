import { ethers } from 'ethers';
import AgriCredXArtifact from './AgriCredX.json';

// Get contract address from environment variable (Vite injects VITE_ prefixed vars)
// In a real deployed app, this comes from the `.env` file generated during deploy.
export const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

export const AgriCredXABI = AgriCredXArtifact.abi;

// Local Hardhat RPC — Proxied through Vite so mobile devices (Ngrok) can reach it
const LOCAL_RPC = import.meta.env.VITE_LOCAL_RPC_URL || '/rpc';

/**
 * Returns a read-only provider connected directly to the local Hardhat node.
 * This avoids BridgeKey routing reads to MST Testnet where the contract doesn't exist.
 */
export function getReadOnlyProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(LOCAL_RPC);
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
