// ============================================================
// AgriCredX — Blockchain / Transaction Types
// ============================================================

/**
 * Result of a blockchain transaction.
 * Used by chain-client to communicate tx outcomes to the frontend.
 */
export interface TransactionResult {
  txHash: string;
  blockNumber?: number;
  status: 'pending' | 'confirmed' | 'failed';
  explorerUrl?: string;
  gasUsed?: string;
  error?: string;
}

/**
 * MST network configuration.
 * Verified from @mstblockchain/mst-sdk constants.
 */
export interface MSTNetworkConfig {
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
  networkName: string;
}

/**
 * Verified MST Testnet configuration.
 * Source: @mstblockchain/mst-sdk v1.0.0 src/utils/constants.js
 */
export const MST_TESTNET: MSTNetworkConfig = {
  rpcUrl: 'https://testnetrpc.mstblockchain.com',
  chainId: 91562037,
  explorerUrl: 'https://mstscan.com',
  networkName: 'MST Testnet',
};

/**
 * Build an MSTScan explorer link for a transaction hash.
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${MST_TESTNET.explorerUrl}/tx/${txHash}`;
}

/**
 * Build an MSTScan explorer link for a contract address.
 */
export function getExplorerAddressUrl(address: string): string {
  return `${MST_TESTNET.explorerUrl}/address/${address}`;
}
