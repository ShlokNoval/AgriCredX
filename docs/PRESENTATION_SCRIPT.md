# AgriCredX: Master Presentation Script (Buyer-First Workflow)

This updated workflow reflects the **"Buyer-First" (Procurement)** model. The Buyer initiates an RFP, the Supplier fulfills it via the Marketplace, and Escrow handles trustless settlement — all on-chain.

---

## 🛑 Before the Judge Arrives (Setup)

1. Ensure your **local blockchain** is running:
   - Open a terminal → `cd contracts` → `npx hardhat node`
2. Ensure the **Smart Contract is deployed**:
   - Open a second terminal → `cd contracts` → `npx hardhat run scripts/deploy.ts --network localhost`
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

## 🎬 Phase 2: The Supplier (Quotation, AI Document Processing & Tokenization)

**Goal:** Show the Supplier fulfilling the RFP, uploading documents, AI extracting to JSON, hash generation, and on-chain minting.

1. **Action:** From Homepage → Click **Supplier Portal**.
2. **Action:** Log in with `supplier@demo.agricredx.com` / `AgriCredX2026Demo!`.
3. **Talking Point:** *"The supplier contacts the buyer and sees the Open Buyer Requirements in their Marketplace feed. They choose to accept the PO."*
4. **Action:** Click **"Fulfill Order"** on the buyer's requirement.
5. **What Happens:** The form auto-populates the Invoice ID, Buyer Wallet Address, Amount, and Due Date.
6. **Explanation (AI & Document Hashing):** *"At this stage, the supplier uploads their documents (like the Invoice and GRN). Behind the scenes, our Grok AI engine parses these documents, converts them into a structured JSON schema, and compares them. It then generates a unique cryptographic Hash Key. This entire process is transparently recorded on the TestNet."*
7. **Action:** Click **"Create Receivable"**.
8. **Behind the Scenes:** *"This creates the receivable on-chain. The digital attestation pipeline mints the NFT and securely stores the generated Hash Keys on the blockchain."*

---

## 🎬 Phase 3: Buyer Acceptance & Escrow Funding

**Goal:** Show the Buyer accepting the quotation, verifying their MSTC balance, and funding the smart contract Escrow.

1. **Action:** Go back to the **Buyer Portal** tab.
2. **Action:** In the **"Lookup Receivable"** section, type the newly created on-chain ID (e.g. `1`) and click **"Fetch Details"**.
3. **Talking Point:** *"The Buyer reviews the supplier's quotation and the AI-generated Hash Keys. Because the Buyer already has enough MSTC tokens (verified previously), they can proceed to accept."*
4. **Action:** Click **"Accept"** (BUYER_ACCEPTED).
5. **Behind the Scenes:** *"If the buyer accepts it, the payment gets directly transferred using the smart contract's Escrow. The tokens are securely locked on-chain."*

---

## 🎬 Phase 4: Physical Logistics (Authorized Delivery Scan)

**Goal:** Show the multi-phase physical delivery, executed strictly by authorized warehouse personnel.

1. **Action:** On the **Supplier Portal**, locate the active receivable and click **"Print QR"**.
2. **Action:** Scan the QR code with your mobile phone (routes through Ngrok).
3. **Talking Point:** *"We make sure that the scan is only done by the authorized person — the delivery/warehouse personnel. They don't need a complex Web3 wallet, just a secure 4-digit PIN to authorize the transaction on the blockchain."*
4. **Action (Mobile):** On your phone, select **"📦 Packed & Ready"**, enter PIN `1234`, and click **Update Status**. 
5. **Action (Mobile):** Repeat, selecting **"🚚 In Transit"**, then finally **"✅ Delivered to Buyer"**.
6. **Behind the Scenes:** *"As the authorized person changes the phase of the delivery, the on-chain status is updated in real-time. Once it is successfully marked as 'Delivered', the Smart Contract Escrow automatically releases the payments to the Supplier."*

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

## 🔧 Quick Troubleshooting

| Problem | Fix |
|---|---|
| "No active receivables found" | Click "Refresh Data" or hard-refresh (`Ctrl+Shift+R`) |
| Hardhat node not responding | Restart: `cd contracts` → `npx hardhat node` → redeploy |
| Port 8545 in use | Kill: `npx kill-port 8545` then restart |
| BridgeKey shows $0.00 balance | Normal — tMSTC has no market price. The tMSTC count is what matters |
| White screen / Supabase error | Check `apps/web/.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
