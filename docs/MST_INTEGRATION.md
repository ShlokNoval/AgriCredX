# MST Blockchain Integration

AgriCredX uses the MST Blockchain to ensure transparent, tamper-evident attestation of agricultural trade documents.

## Verified Configuration

The following MST configurations were verified directly from the official MST network specification:

- **Network:** MST Testnet
- **Chain ID:** `91562037`
- **RPC URL:** `https://testnetrpc.mstblockchain.com`
- **Explorer:** `https://testnet.mstscan.com`

*Note: Do NOT use the mainnet explorer (mstscan.com).*

## Deployment Security Procedure

We strictly enforce separation of local Hardhat accounts and MST Testnet keys. 

1. **Deployer Key:** Must be supplied via the `DEPLOYER_PRIVATE_KEY` environment variable.
2. **Environment File:** You must create a `.env` file in the root based on `.env.example`.
3. **No Commits:** `.env` must NEVER be committed to Git.
4. **Funding:** The deployer key must be pre-funded using the official MST testnet faucet.

## Wallet Integration

**Primary:** BridgeKey Extension  
BridgeKey will be connected via standard `window.ethereum`. For development/verification, if BridgeKey is unavailable, an Ethers JSON RPC fallback or standard EVM wallet (MetaMask) is used.

## SDK Usage

We use `@mstblockchain/mst-sdk` as the primary interaction layer. It wraps `ethers.js` v6 and exposes `Client`, `Provider`, and `Signer`.

## Application Transactions

### First Verified Transaction: createReceivable
- **Invoice ID:** `INV-2026-09124`
- **Buyer:** (Testnet address to be determined)
- **Amount:** `850000`
- **Due Date:** 60-day demo maturity

*Deployment address and transaction hashes will be recorded here upon successful testnet deployment.*
