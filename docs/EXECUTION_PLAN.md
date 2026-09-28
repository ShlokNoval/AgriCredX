# Execution Plan

## Ownership Matrix

- **Developer 1:** Blockchain (`contracts/`), Frontend (`apps/web/`), Chain integration (`packages/chain-client/`)
- **Developer 2:** Backend (`supabase/`), AI Service (`services/ai/`), Data models (`packages/document-schemas/`)
- **Shared:** `packages/shared-types/`, Documentation (`docs/`)

## Phases

### Phase 1: Smart Contracts (Dev 1) & Supabase Schema (Dev 2)
- Deploy the monolithic MVP contract `AgriCredX.sol`.
- Run Hardhat lifecycle tests.
- Stand up Supabase schema with correct enums and RLS.

### Phase 2: AI Verification (Dev 2) & Core UI (Dev 1)
- Develop PyMuPDF + Gemini pipeline for extracting Invoice, PO, GRN, etc.
- Build React routing (Supplier, Buyer, Financier views).
- Implement BridgeKey connection.

### Phase 3: Integration (Both)
- Wire frontend to Supabase API and AI service.
- Integrate contract calls via `chain-client`.
- **(Judge Update):** Ensure NFT Certificate generation, Native MST Escrow, and physical Delivery are integrated on-chain.
- Verify the exact lifecycle:
  `CREATED → DELIVERED → VERIFIED → BUYER_ACCEPTED → ATTESTED → FINANCEABLE → FUNDED → OUTSTANDING → REPAID → CLOSED`

### Phase 4: Financing & UI Polish (Both)
- Implement bidding/funding UI.
- Apply high-fidelity styling (institutional trade finance theme).

### Phase 5: Testing & Dress Rehearsal (Both)
- End-to-end dry run.
- Tamper attack demo preparation.
- Video recording for submission.
