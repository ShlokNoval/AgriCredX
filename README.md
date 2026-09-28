# AgriCredX 🌾

**On-chain Trade Finance & Supply Chain Platform — MST Buildathon 2026**  
**Team InnoVision** | Branch: `shlok-noval`

---

## What is AgriCredX?

AgriCredX converts fragmented agricultural trade into a trustless, cryptographically-verified pipeline. Every receivable is minted as an **ERC-721 NFT certificate**. Escrow is enforced natively in the smart contract. The full workflow — from buyer procurement to payment release — happens on-chain with no intermediary.

---

## The Workflow

```
Buyer Posts RFP
    → Supplier Sends Quotation (QUOTATION_SENT)
    → Buyer Accepts & Locks Escrow (BUYER_ACCEPTED)
    → Supplier Uploads Docs, AI Hashes (DOCUMENTATION_UPLOADED)
    → Logistics: PACKED → IN_TRANSIT → DELIVERED
    → Escrow auto-released to Supplier on DELIVERED
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Smart Contract | Solidity (ERC721URIStorage) on Hardhat EVM |
| Wallet | BridgeKey (MetaMask-compatible Web3 wallet) |
| AI Engine | Grok AI (xAI) for invoice extraction & verification |
| Backend DB | Supabase (PostgreSQL + Row Level Security) |
| Logistics | QR Code via Ngrok tunnel for mobile delivery confirmation |
| Token Standard | ERC-721 NFT Certificate per receivable |

---

## Quick Start

```powershell
# 1. Start local blockchain
cd contracts && npx hardhat node

# 2. Deploy smart contract
cd contracts && npx hardhat run scripts/deploy.ts --network localhost

# 3. Start frontend
npm run dev --workspace=apps/web

# 4. Start Ngrok tunnel (for mobile QR scanner)
ngrok http 5173
```

**Environment Variables** (`apps/web/.env.local`):
```
VITE_AGRICREDX_CONTRACT_ADDRESS=<from deploy output>
VITE_SUPABASE_URL=https://nheljbbndmaplgcncfqi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AjuyQR9okk0p17HbIHe_1A_Q4fVqwUO
```

---

## For a New AI Agent Session

Read `docs/AGENT_CONTEXT.md` first. It contains the full project state, all known issues, the exact smart contract function signatures, frontend architecture, and wallet configuration. Do NOT start coding without reading it.

---

## GitHub

- **Repo:** https://github.com/ShlokNoval/Team_InnoVision
- **Branch:** `shlok-noval`
