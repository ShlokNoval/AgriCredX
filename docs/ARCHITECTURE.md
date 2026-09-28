# AgriCredX Architecture

## System Overview

AgriCredX is an Institutional Trust Operating System for Agricultural Trade Finance. It provides a tamper-evident workflow for verifiable receivables, powered by AI document extraction and MST Blockchain attestations.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Service:** Python, FastAPI, PyMuPDF, Gemini
- **Blockchain:** MST Testnet, Solidity, Hardhat
- **Chain Client:** `@mstblockchain/mst-sdk`, `ethers.js`
- **Wallet:** BridgeKey

## Canonical Lifecycle

The receivable lifecycle is strictly enforced across all layers (DB, UI, Contracts):

1. **CREATED:** Supplier creates receivable and uploads documents.
2. **VERIFIED:** AI service completes verification of all documents.
3. **BUYER_ACCEPTED:** Buyer explicitly reviews and accepts the receivable.
4. **ATTESTED:** System anchors a deterministic digest to MST Blockchain.
5. **FINANCEABLE:** Receivable is available for financing bids.
6. **FUNDED:** Financier funds the receivable.
7. **OUTSTANDING:** Receivable is active and awaiting repayment.
8. **REPAID:** Repayment is recorded.
9. **CLOSED:** Lifecycle completed.

Disputes route the status to **DISPUTED**, which blocks financeability until resolved back to VERIFIED.

## Security & Trust Boundaries

- Raw documents remain OFF-CHAIN in Supabase Storage.
- Sensitive business data (names, line items) remain OFF-CHAIN in PostgreSQL.
- Attestation digests, wallet addresses, and lifecycle state transitions are ON-CHAIN.
- Buyer acceptance requires cryptographic wallet authorization.
