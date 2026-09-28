# MST Blockchain Integration

AgriCredX uses the MST Blockchain to ensure transparent, tamper-evident attestation of agricultural trade documents.

## Verified Configuration

The following MST configurations were verified directly from the `@mstblockchain/mst-sdk` v1.0.0 package source code during the bootstrap phase:

- **Network:** MST Testnet
- **Chain ID:** `91562037`
- **RPC URL:** `https://testnetrpc.mstblockchain.com`
- **Explorer:** `https://mstscan.com`

## Wallet Integration

**Primary:** BridgeKey Extension  
BridgeKey will be connected via standard `window.ethereum` or its specific provider if injected separately. `chain-client` handles this abstraction.

## SDK Usage

We use `@mstblockchain/mst-sdk` as the primary interaction layer. It wraps `ethers.js` v6 and exposes `Client`, `Provider`, and `Signer`.
