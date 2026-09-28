import { Provider, Signer, Client, Constants } from '@mstblockchain/mst-sdk';

/**
 * Initializes and returns an MST SDK provider.
 */
export function getProvider(rpcUrl: string = Constants.DEFAULT_RPC_URL): Provider {
  return new Provider(rpcUrl);
}

/**
 * Initializes and returns an MST SDK signer using a private key.
 */
export function getSigner(privateKey: string, rpcUrl?: string): Signer {
  const provider = getProvider(rpcUrl);
  return new Signer(privateKey, provider);
}

/**
 * Creates a new Client instance (Provider + optional Signer).
 */
export function getClient(rpcUrl?: string, privateKey?: string): Client {
  return new Client(rpcUrl || Constants.DEFAULT_RPC_URL, privateKey);
}

// Re-export core MST SDK utilities for convenience
export { Constants } from '@mstblockchain/mst-sdk';
