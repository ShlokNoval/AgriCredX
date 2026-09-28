import { ethers } from 'ethers';
import AgriCredXArtifact from './AgriCredX.json';

// Get contract address from environment variable (Vite injects VITE_ prefixed vars)
// In a real deployed app, this comes from the `.env` file generated during deploy.
export const CONTRACT_ADDRESS = import.meta.env.VITE_AGRICREDX_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

export const AgriCredXABI = AgriCredXArtifact.abi;

/**
 * Creates an ethers Contract instance connected to either a read-only provider
 * or a signer (for write operations).
 */
export function getAgriCredXContract(providerOrSigner: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, AgriCredXABI, providerOrSigner);
}
