# AgriCredX 🌾

**Institutional Trust Operating System for Agricultural Trade Finance**

Built for the MST Blockchain Buildathon 2026 by Team InnoVision.

AgriCredX solves the $1.5T trade finance gap by bridging off-chain documentation with on-chain trust. It allows agricultural suppliers to convert their physical trade documents (Invoices, Purchase Orders, Goods Receipt Notes, Quality Certificates) into verifiable, financeable assets.

## Overview

1. **AI Document Verification:** Extracts and cross-validates data from unstructured PDFs (Invoice vs PO vs GRN).
2. **MST Blockchain Attestation:** Anchors a tamper-evident digest of the verified state.
3. **BridgeKey Wallet Acceptance:** Cryptographic authorization by the buyer.
4. **Institutional Financing:** Allows financiers to fund fully verified and attested receivables.

## Repository Structure

- `apps/web/` - React frontend
- `services/ai/` - Python FastAPI AI service
- `contracts/` - Solidity smart contracts & Hardhat
- `supabase/` - Database migrations, seed data, edge functions
- `packages/` - Shared TypeScript libraries (`shared-types`, `chain-client`, `document-schemas`)
- `docs/` - Architecture, execution plans, runbooks

## Quick Start (Bootstrap Phase)

```bash
npm install
npm run build
```

See [docs/EXECUTION_PLAN.md](./docs/EXECUTION_PLAN.md) for development workflows.
