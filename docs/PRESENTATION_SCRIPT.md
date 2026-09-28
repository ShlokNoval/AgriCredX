# AgriCredX: Master Presentation Script (Buyer-First Workflow)

This updated workflow reflects the **"Buyer-First" (Procurement)** model. The Buyer initiates an RFP, the Supplier fulfills it via the Marketplace, and Escrow handles trustless settlement — all on-chain.

---

## 🛑 Before the Judge Arrives (Setup)

1. Ensure your **local blockchain** is running:
   - Open a terminal → `cd contracts` → `npx hardhat node`
2. Ensure the **Smart Contract is deployed**:
   - Open a second terminal → `cd contracts` → `npx hardhat run scripts/deploy.ts --network mst_testnet`
3. Ensure the **Frontend** is running:
   - Open a third terminal → `npm run dev --workspace=apps/web`
4. Ensure **Ngrok** is running:
   - `ngrok http 5173` (so the QR scanner works on your phone)
5. Have your **BridgeKey wallet** extension installed and unlocked.
6. Open browser tabs:
   - Tab 1: `http://localhost:5174/` (Homepage)
   - Tab 2: `http://localhost:5174/tamper` (The Tamper Demo — keep ready)

### Tech Stack Summary (For the Judge)
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Smart Contract | Solidity (ERC721URIStorage) on Hardhat EVM |
| Blockchain | Local Hardhat Node (simulating MST Testnet) |
| Wallet | BridgeKey (MetaMask-compatible Web3 wallet) |
| AI Engine | Grok AI (xAI) for invoice extraction & verification |
| Backend DB | Supabase (PostgreSQL + Row Level Security) |
| Logistics | QR Code via Ngrok tunnel for mobile delivery confirmation |
| Token Standard | ERC-721 NFT Certificate per receivable |

---

## 🎬 Phase 0: The Tech Stack & Web3 Onboarding (BridgeKey)

**Goal:** Introduce the architecture and demonstrate secure wallet connection.

1. **Action:** Open the Homepage (`http://localhost:5174/`).
2. **Talking Point (Tech Stack):** *"Before we start the workflow, let me explain the architecture. Our frontend is built on React + Vite. Our backend combines Supabase for relational data and Grok AI for invoice extraction. But the core engine is a Solidity smart contract deployed on our local Hardhat EVM node, simulating the MST Testnet. Every receivable is minted as an ERC-721 NFT."*
3. **Action:** Click the **"Connect BridgeKey"** button in the top-right corner of the nav bar.
4. **Action:** The BridgeKey extension panel slides out. Enter your password to unlock.
5. **Talking Point (Security):** *"Because we handle high-value Trade Finance assets, every participant — Buyer, Supplier, Admin — must first authenticate cryptographically using their BridgeKey wallet. This ensures every action is signed on-chain and tamper-proof."*
6. **Action:** Once connected, the button changes to show your truncated wallet address (e.g. `0xACa2...0B78`).

---

## 🎬 Phase 1: The Buyer (Posting the Requirement)

**Goal:** Show how institutional buyers post procurement requirements, and prove the MSTC token balance check.

1. **Action:** From Homepage → Click **Buyer Portal**.
2. **Action:** Log in with `buyer@demo.agricredx.com` / `AgriCredX2026Demo!`.
3. **Talking Point:** *"In this workflow, the trade starts with the Buyer. The Buyer needs 500 MT of Premium Wheat and has a budget of 1 MSTC."*
4. **Action:** Click the green **"Post New Requirement"** button.
5. **Action:** Fill out the modal:
   - **Buyer / Company Name:** `Global Agri Corp`
   - **Commodity Needed:** `Premium Wheat`
   - **Quantity:** `500 MT`
   - **Budget (MSTC):** `1`
   - **Required Delivery Date:** Pick a date ~1 week from today
6. **Explanation (Crucial Balance Check):** *"Notice this line: 'Available Balance: 10000.00 MSTC'. The system reads the wallet balance from the blockchain. If I try to post a requirement for more MSTC than I have, the system blocks me. You cannot post fake orders you can't afford."*
7. **Action:** Click **"Publish Requirement"**. An alert confirms it was posted.
8. **Behind the Scenes:** *"This requirement is now broadcasted to the AgriCredX Supplier Marketplace. Suppliers can view open RFPs and choose to fulfill them."*
9. **Bonus Action:** Click the **"Open Requirements"** stat widget (shows count). It expands to show a table of all your posted RFPs with ID, commodity, budget, delivery date, and status `OPEN`.

---

## 🎬 Phase 2: The Supplier (Sending the Quotation/Proposal)

**Goal:** Show the Supplier selecting the RFP and sending a formal quotation on-chain before uploading any sensitive documents.

1. **Action:** From Homepage → Click **Supplier Portal**.
2. **Action:** Log in with `supplier@demo.agricredx.com` / `AgriCredX2026Demo!`.
3. **Talking Point:** *"The supplier sees the Open Buyer Requirements in their Marketplace feed. They choose to submit a proposal."*
4. **Action:** Click **"Send Quotation"** on the buyer's requirement.
5. **What Happens:** The form auto-populates the Quotation ID, Buyer Wallet Address, Amount, and Due Date.
6. **Action:** Click **"Send Quotation"** at the bottom of the form.
7. **Behind the Scenes:** *"This creates an on-chain record in the `QUOTATION_SENT` state. No documents are uploaded yet, and no Escrow is funded yet. We must wait for the buyer to explicitly accept this offer."*
8. **What to check:** The "Your Active Receivables" table below should show the new receivable with status **QUOTATION SENT** (amber badge). Click **"Refresh Data"** if it doesn't appear immediately.

---

## 🎬 Phase 3: Buyer Acceptance & Escrow Funding

**Goal:** Show the Buyer accepting the quotation, verifying their MSTC balance, and funding the smart contract Escrow. **Then verify the "after state" is visible.**

1. **Action:** Go back to the **Buyer Portal** tab.
2. **Action:** Scroll down to the **"Your Actionable Receivables"** table. You should see the new receivable with status **QUOTATION SENT** (amber badge). Click **"Review Quotation"** to load it.
3. **Alternative:** In the **"Lookup Receivable"** section, type the newly created on-chain ID (e.g. `1`) and click **"Fetch Details"**.
4. **Talking Point:** *"The Buyer reviews the supplier's quotation. Because the Buyer already has enough MSTC tokens (verified previously), they can proceed to accept."*
5. **Action:** Click **"Accept Quotation & Lock Escrow"**.
6. **What Happens After Acceptance — KEY POINTS TO SHOW:**
   - ✅ A **green confirmation banner** appears: *"Quotation Accepted — Escrow Locked"* with the locked MSTC amount
   - ✅ The **lifecycle progress tracker** updates — Step 1 (QUOTATION SENT) shows a green checkmark, Step 2 (BUYER ACCEPTED) is highlighted as the current step
   - ✅ The **action area** now shows: *"✓ Quotation Accepted. Awaiting supplier document upload."*
   - ✅ The **status badge** changes from amber "QUOTATION SENT" to emerald "BUYER ACCEPTED"
   - ✅ The **receivables table** below automatically refreshes to show the updated status
   - ✅ The **TX Confirmed** hash is displayed — you can copy this for the MST Block Explorer
7. **Behind the Scenes:** *"By explicitly accepting the quotation, the payment gets securely locked into the smart contract's Escrow. Only now is the supplier authorized to process the order. The lifecycle tracker shows exactly where we are in the pipeline."*

---

## 🎬 Phase 4: AI Document Processing & Physical Logistics

**Goal:** Show the Supplier uploading **real documents** (not dummy hashes), the cryptographic hashing pipeline, and the multi-phase physical delivery.

1. **Action:** Go back to the **Supplier Portal**, locate the active receivable (now in **BUYER ACCEPTED** status — emerald badge).
2. **Action:** Click the **"Upload Docs & Hash"** button next to the receivable.
3. **Action:** A **file picker** opens — select a real PDF document (Invoice, GRN, or any test PDF).
4. **Explanation (AI & Document Hashing):** *"Now that the buyer has committed funds, the supplier uploads their documents. Our system reads the raw bytes of the file, computes its keccak256 cryptographic hash, and anchors that hash digest on-chain as the attestation. This means if even one byte of this document changes, the hash will be completely different."*
5. **What to check after upload:**
   - ✅ A **green success banner** appears showing the **Attestation Digest** (hex hash) and **TX Hash**
   - ✅ The receivable status changes to **DOCS UPLOADED** (blue badge)
   - ✅ A **"Verify Doc Hash"** button appears next to the receivable

### 4a. Document Hash Verification (Supplier Side)

6. **Action:** Click the **"Verify Doc Hash"** button and select the **same PDF** you just uploaded.
7. **What Happens:** The system shows **✓ HASH MATCH — Document Integrity Verified** in green, with both the file hash and on-chain hash displayed side by side.
8. **Action:** Now click **"Verify Doc Hash"** again but select a **different file** (any other PDF or image).
9. **What Happens:** The system shows **✗ HASH MISMATCH — Document Tampered or Different File** in red.
10. **Talking Point:** *"This is exactly how tamper detection works. The original document's hash is locked on-chain. If anyone submits a different document — even with the same filename — the hash won't match."*

### 4b. Document Hash Verification (Buyer Side)

11. **Action:** Go back to the **Buyer Portal** and fetch the same receivable (ID `1`).
12. **What to check:**
    - ✅ The **Cryptographic Attestation** widget (dark panel) now appears — showing the on-chain hash
    - ✅ An **"Upload & Verify Document"** button is visible inside the attestation widget
13. **Action:** Click **"Upload & Verify Document"** and select the original supplier PDF.
14. **What Happens:** Green result: **✓ HASH MATCH** — the buyer confirms the document the supplier gave them matches what's on-chain.
15. **Talking Point:** *"The buyer can independently verify any document from the supplier by checking its hash against the immutable on-chain record. No trust required — pure cryptographic proof."*

### 4c. Physical Logistics (QR Code + Mobile)

16. **Action:** Go back to the **Supplier Portal**. Click **"Print QR"** on the receivable (now in DOCS UPLOADED status).
17. **Action:** Scan the QR code with your mobile phone (routes through Ngrok).
18. **Talking Point:** *"We make sure that the logistics scan is only done by the authorized warehouse personnel. They don't need a complex Web3 wallet, just a secure 4-digit PIN."*
19. **Action (Mobile):** On your phone, select **"📦 Packed & Ready"**, enter PIN `1234`, and click **Update Status**. 
20. **Action (Mobile):** Repeat, selecting **"🚚 In Transit"**, then finally **"✅ Delivered to Buyer"**.
21. **Behind the Scenes:** *"As the authorized person changes the phase of the delivery, the on-chain status is updated in real-time. Once it is successfully marked as 'Delivered', the Smart Contract Escrow automatically releases the payments to the Supplier."*

---

## 🎬 Phase 5: The Fraud Catch (Tamper Demo)

**Goal:** Prove the digital attestation pipeline and hash comparison.

1. **Action:** Click **"Judge's Tamper Demo"** in the top navigation bar.
2. **Talking Point:** *"Let me show you exactly how the JSON schema extraction and hash generation works."*
3. **Action:** Run Scenario A (Authentic) → Green: `HASH MATCH ✓`.
4. **Action:** Run Scenario B (Doctored) → Red: `HASH MISMATCH DETECTED ✗`.
5. **Explanation:** *"If the supplier uploads a doctored document, the AI extracts the JSON, generates a new hash, and compares it to the original on-chain Hash Key. It mismatches, proving our pipeline is completely transparent and tamper-proof."*

---

## 🎬 Phase 6: Transparency via MST TestNet Scan

**Goal:** Prove the entire process happened on a public blockchain.

1. **Action:** Open a new tab and go to the official MST Block Explorer: `https://testnet.mstscan.com`.
2. **Talking Point:** *"To prove this is a transparent process, we can view all these transactions on the official MST TestNet MST Scan."*
3. **Action:** Copy the transaction hash you received from the Supplier Dashboard or Buyer Dashboard and paste it into the explorer search bar.
4. **Explanation:** *"Here is the undeniable, immutable proof of the transaction on the MST TestNet. The digital attestation, the AI hash keys, the delivery phases, and the escrow settlement are all public and verifiable."*
5. **Conclusion:** *"AgriCredX is a complete, end-to-end digital attestation pipeline on-chain. Thank you."*

---

## 🧪 Full End-to-End Testing Checklist

Use this checklist to verify the entire project is working correctly before the demo.

### Pre-Flight Checks
- [ ] Hardhat node running (`cd contracts && npx hardhat node`)
- [ ] Contract deployed (`cd contracts && npx hardhat run scripts/deploy.ts --network localhost`)
- [ ] Frontend running (`npm run dev --workspace=apps/web`)
- [ ] Ngrok running (`ngrok http 5173`)
- [ ] BridgeKey extension installed, unlocked, and connected to **Localhost 8545**
- [ ] Two browser profiles or two different wallet addresses available (one for Buyer, one for Supplier)

### Workflow Test Steps
| # | Action | Expected Result | ✓ |
|---|--------|-----------------|---|
| 1 | Connect wallet on Homepage | Truncated address shows in navbar | |
| 2 | Go to Buyer Portal, post an RFP | Alert: "Requirement posted successfully" | |
| 3 | Click "Open Requirements" stat widget | Table shows your posted requirement with status OPEN | |
| 4 | Switch to Supplier Portal | Open Buyer Requirements table visible with the RFP | |
| 5 | Click "Send Quotation" on the RFP | Form auto-fills with buyer's data | |
| 6 | Submit the quotation form | TX hash shown; "Your Active Receivables" shows QUOTATION SENT (amber) | |
| 7 | Switch to Buyer Portal, fetch receivable #1 | Details panel shows invoice, amount, status QUOTATION SENT | |
| 8 | Click "Accept Quotation & Lock Escrow" | BridgeKey asks to confirm MSTC transfer | |
| 9 | Confirm the transaction | ✅ Green banner: "Quotation Accepted — Escrow Locked" | |
| 10 | Check lifecycle tracker | Step 1 ✓, Step 2 highlighted as current | |
| 11 | Check receivables table below | Status now shows BUYER ACCEPTED (emerald) — auto-refreshed | |
| 12 | Switch to Supplier Portal, click Refresh Data | Status shows BUYER ACCEPTED (emerald) | |
| 13 | Click "Upload Docs & Hash" → pick a PDF | File picker opens, selects file | |
| 14 | Wait for TX confirmation | Green banner with Attestation Digest + TX Hash shown | |
| 15 | Status changes to DOCS UPLOADED (blue) | "Verify Doc Hash" button appears | |
| 16 | Click "Verify Doc Hash" → pick SAME PDF | ✓ HASH MATCH — green result | |
| 17 | Click "Verify Doc Hash" → pick DIFFERENT file | ✗ HASH MISMATCH — red result | |
| 18 | Switch to Buyer Portal, fetch receivable | Attestation widget appears with on-chain hash | |
| 19 | Click "Upload & Verify Document" → pick original PDF | ✓ HASH MATCH inside attestation widget | |
| 20 | Click "Upload & Verify Document" → pick different file | ✗ HASH MISMATCH inside attestation widget | |
| 21 | Back to Supplier, click "Print QR" | QR code popup opens | |
| 22 | Scan QR on phone, enter PIN 1234 | DeliveryScanner page loads | |
| 23 | Click "📦 Packed & Ready" → Update Status | Status: PACKED | |
| 24 | Click "🚚 In Transit" → Update Status | Status: IN_TRANSIT | |
| 25 | Click "✅ Delivered to Buyer" → Update Status | Status: DELIVERED; Escrow auto-releases to Supplier | |
| 26 | Refresh Supplier Portal | Status: DELIVERED; balance increased | |
| 27 | Go to Tamper Demo (`/tamper`) | Page loads with two scenarios | |
| 28 | Run Scenario A (Authentic) | HASH MATCH ✓ (green) | |
| 29 | Run Scenario B (Doctored) | HASH MISMATCH DETECTED ✗ (red) | |

### Common Issues & Fixes
| Problem | Fix |
|---|---|
| "No active receivables found" | Click "Refresh Data" or hard-refresh (`Ctrl+Shift+R`) |
| "Not authorized buyer" error | Supplier must use the exact buyer wallet address in the quotation form |
| "Must lock exact escrow amount" | The buyer acceptance sends `msg.value = r.amount` automatically |
| Hardhat node not responding | Restart: `cd contracts` → `npx hardhat node` → redeploy |
| Port 8545 in use | Kill: `npx kill-port 8545` then restart |
| BridgeKey shows $0.00 balance | Normal — tMSTC has no market price. The tMSTC count is what matters |
| White screen / Supabase error | Check `apps/web/.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
| "Upload Docs & Hash" does nothing | Make sure wallet is connected; status must be BUYER_ACCEPTED |
| File picker doesn't open | Check browser permissions; try a different browser |
| QR code doesn't load on phone | Ensure Ngrok tunnel is active and URL is accessible |
| Delivery PIN rejected | Default PIN is `1234` |
