# AgriCredX — Complete Agent Context Document
**Last Updated:** 2026-09-29 | **Branch:** `shlok-noval`  
**Team:** InnoVision | **Event:** MST Buildathon 2026

> **READ THIS FIRST** if you are a new AI agent session taking over this project.  
> This document is the single source of truth for the current project state.

---

## 1. Project Purpose
AgriCredX is an **on-chain Trade Finance & Supply Chain platform** built for the MST Buildathon 2026.  
It turns fragmented agri-trade (Buyer → Supplier → Logistics → Finance) into a trustless, cryptographically-verified pipeline using ERC-721 NFT certificates and native MSTC token Escrow on the MST Testnet / Local Hardhat EVM.

**Mentor requirement that was already implemented:** Full digital attestation pipeline on-chain.

---

## 2. The Exact Workflow (Do NOT shortcut any step)

```
Buyer Posts RFP (localStorage)
    ↓
Supplier Sends Quotation → createReceivable() on-chain
    · Status: QUOTATION_SENT (0)
    · NFT Certificate minted to Supplier
    ↓
Buyer Accepts Quotation → buyerAccept() on-chain
    · Sends exact MSTC amount as msg.value (native escrow locked in contract)
    · Status: BUYER_ACCEPTED (1)
    ↓
Supplier Uploads Documents → uploadDocumentation() on-chain
    · AI (simulated) generates keccak256 hash
    · Anchors attestationDigest bytes32 on-chain
    · Status: DOCUMENTATION_UPLOADED (2)
    · Buyer's Cryptographic Attestation widget ONLY appears after this step
    ↓
Logistics QR Scan (mobile, via Ngrok tunnel)
    · PIN-protected endpoint — no Web3 wallet needed for delivery person
    · Supplier prints QR → delivery person scans
    · updateLogisticsStatus() moves: PACKED(3) → IN_TRANSIT(4) → DELIVERED(5)
    ↓
On DELIVERED: Contract auto-calls r.supplier.transfer(r.amount)
    · Escrow is AUTOMATICALLY released to Supplier's wallet
    · No manual step needed
```

---

## 3. Smart Contract — AgriCredX.sol

**File:** `contracts/contracts/AgriCredX.sol`  
**ABI:** `apps/web/src/lib/AgriCredX.json` (auto-copied on every deploy)

### Key Functions
| Function | Who Calls | Gas Value | Description |
|---|---|---|---|
| `createReceivable(invoiceId, buyer, amount, dueDate, tokenURI)` | Supplier | 0 | Creates on-chain record + mints NFT |
| `buyerAccept(id)` | Buyer | **= r.amount (escrow)** | Locks exact escrow in contract |
| `uploadDocumentation(id, bytes32_digest)` | Supplier | 0 | Anchors AI hash |
| `updateLogisticsStatus(id, newStatus)` | Anyone (delivery driver) | 0 | Updates phase; auto-pays on DELIVERED |
| `fundReceivable(id)` | Financier | <= r.amount | Trade finance layer |
| `markRepaid(id)` | Buyer | >= r.amount | Repays financier |
| `dispute(id)` | Buyer | 0 | Marks DISPUTED |

### Status Enum (CRITICAL — do not confuse the numbering)
```
0: QUOTATION_SENT
1: BUYER_ACCEPTED
2: DOCUMENTATION_UPLOADED
3: PACKED
4: IN_TRANSIT
5: DELIVERED          ← Escrow auto-release happens here
6-13: Legacy/finance states (not used in primary flow)
```

### Deployment
- **Network:** Local Hardhat node at `http://127.0.0.1:8545`
- **Contract Address:** Stored in `apps/web/.env.local` as `VITE_AGRICREDX_CONTRACT_ADDRESS`
- **Deploy command:** `cd contracts && npx hardhat run scripts/deploy.ts --network localhost`
- **ABI auto-sync:** `deploy.ts` copies artifact to `apps/web/src/lib/AgriCredX.json` automatically

---

## 4. Frontend — Key Files

### Pages
| File | Role |
|---|---|
| `apps/web/src/pages/SupplierDashboard.tsx` | Send Quotation form, Receivables table with "Upload Docs & Hash" / "Print QR" |
| `apps/web/src/pages/BuyerDashboard.tsx` | Post RFP, Lookup Receivable, "Accept Quotation & Lock Escrow" button |
| `apps/web/src/pages/DeliveryScanner.tsx` | PIN-protected QR scan page for logistics (PACKED/IN_TRANSIT/DELIVERED) |
| `apps/web/src/pages/TamperDemo.tsx` | Judge's tamper demo — AI hash comparison |
| `apps/web/src/pages/FinancierDashboard.tsx` | Finance layer |
| `apps/web/src/pages/AdminDashboard.tsx` | Admin view |

### Critical Library Files
| File | Role |
|---|---|
| `apps/web/src/lib/contract.ts` | Exports: `getReadOnlyProvider()`, `getReadOnlyContract()`, `getAgriCredXContract(signer)` |
| `apps/web/src/lib/AgriCredX.json` | ABI — do NOT edit manually; always re-deploy to update |
| `apps/web/src/contexts/WalletContext.tsx` | Exposes `{ address, isConnected, signer, provider, connectWallet, disconnectWallet }` |

### Key UI Rules
1. **Cryptographic Attestation Widget** on Buyer Dashboard only shows if `status >= 2`. It shows the real `attestationDigest` from chain.
2. **"Accept Quotation & Lock Escrow" button** only shows if `status === 0` (QUOTATION_SENT).
3. **"Upload Docs & Hash" button** on Supplier only shows if `status === 'BUYER_ACCEPTED'`.
4. **"Print QR" button** on Supplier only shows if `status` is DOCUMENTATION_UPLOADED, PACKED, or IN_TRANSIT.
5. All **write transactions** use the injected `signer` from WalletContext — NEVER a hardcoded Hardhat account.
6. All **read operations** use `getReadOnlyContract()` pointing to the local Hardhat RPC via Vite's `/rpc` proxy.

---

## 5. The "Not authorized buyer" Problem

The `buyerAccept()` function requires `msg.sender == r.buyer`.
The buyer address is **set when the supplier creates the receivable**.
So the Supplier MUST put the **exact wallet address of the connected Buyer** in the quotation form.
If they put a wrong/mock address, the contract will revert with "Not authorized buyer."

---

## 6. Running the Project (in order)

```powershell
# Terminal 1: Start local blockchain
cd contracts && npx hardhat node

# Terminal 2: Deploy smart contract (also copies ABI to frontend)
cd contracts && npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Start frontend dev server
npm run dev --workspace=apps/web

# Terminal 4: Ngrok tunnel (for mobile QR scanner)
ngrok http 5173
```

### Environment Variables (`apps/web/.env.local`)
```
VITE_AGRICREDX_CONTRACT_ADDRESS=<address from deploy>
VITE_SUPABASE_URL=https://nheljbbndmaplgcncfqi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AjuyQR9okk0p17HbIHe_1A_Q4fVqwUO
```

---

## 7. Wallet Configuration

- **BridgeKey Extension** is the primary wallet (MetaMask-compatible)
- **Localhost Hardhat** is the network for demo smart contract interactions
- **MST Testnet** is where the real tMSTC tokens live (connected buyer's balance shows ~59 tMSTC)
- Vite proxies `/rpc` → `http://127.0.0.1:8545` for cross-origin reads
- **IMPORTANT:** Buyer's wallet balance displayed in the RFP modal reads from the CONNECTED browser wallet (BrowserProvider), not the Hardhat node

---

## 8. Delivery Scanner

**File:** `apps/web/src/pages/DeliveryScanner.tsx`  
**URL Pattern:** `/delivery/{receivableId}?hash={attestationDigest}`  
**PIN:** `1234`  
**Status Transitions:**
- 📦 Packed & Ready → PACKED (3)
- 🚚 In Transit → IN_TRANSIT (4)
- ✅ Delivered to Buyer → DELIVERED (5) → AUTO ESCROW RELEASE

---

## 9. Tamper Demo (For Judges)

**File:** `apps/web/src/pages/TamperDemo.tsx`  
**URL:** `/tamper`
- Scenario A (Authentic): HASH MATCH ✓
- Scenario B (Doctored): HASH MISMATCH DETECTED ✗

---

## 10. GitHub

- **Repo:** `https://github.com/ShlokNoval/Team_InnoVision`
- **Active branch:** `shlok-noval`
- **Push command:** `git push origin shlok-noval`

---

## 11. Known Fixed Issues (Don't Re-introduce)

| Issue | Was Caused By | Fix Applied |
|---|---|---|
| "Not authorized buyer" | Hardcoded mock Hardhat address in Supplier form | Cleared default, user must enter real buyer address |
| "getContract is not a function" | Imported non-existent function | Only use `getReadOnlyContract`, `getReadOnlyProvider`, `getAgriCredXContract` from `contract.ts` |
| "Must lock exact escrow amount" | `buyerAccept()` called with 0 value | Frontend passes `{ value: ethers.parseEther(amount) }` override |
| ABI mismatch / uploadDocumentation crash | Old ABI in frontend | `deploy.ts` now auto-copies ABI on every deploy |
| Balance showed 10000 MSTC | Was reading from Hardhat mock account | Now reads from `BrowserProvider.getBalance(address)` |
| Delivery Scanner marking DELIVERED instantly | Skipped PACKED/IN_TRANSIT | Multi-phase stepper with PIN protection now enforced |
| Fake "Simulating Grok AI" alert | Intrusive popup | Replaced with in-button loading state text |
| Cryptographic Attestation showed fake hash | Hardcoded hex string | Now reads real `attestationDigest` from chain, only shown after docs uploaded |

---

## 12. Remaining Work (If Time Permits)

- [ ] **Real document upload UI**: Currently generates a dummy `keccak256` hash. Ideally a file input for Invoice/GRN PDFs, AI extracts JSON schema, JSON is hashed.
- [ ] **Supplier Marketplace**: Currently reads from localStorage. Could be enhanced.
- [ ] **MST Testnet live deploy**: Currently all contract calls go to local Hardhat. Set `VITE_LOCAL_RPC_URL` to MST testnet RPC for live deployment.
