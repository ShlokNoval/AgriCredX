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

## 🎬 Phase 2: The Supplier (Fulfilling the Order & Tokenization)

**Goal:** Show the Supplier selecting the RFP and minting the asset on-chain.

1. **Action:** From Homepage → Click **Supplier Portal**.
2. **Action:** Log in with `supplier@demo.agricredx.com` / `AgriCredX2026Demo!`.
3. **Talking Point:** *"The supplier logs in and sees the Open Buyer Requirements in their Marketplace feed — posted by different buyers."*
4. **Action:** Find the requirement you just posted (e.g. "Global Agri Corp — 500 MT Premium Wheat — 1 MSTC") and click **"Fulfill Order"**.
5. **What Happens Automatically:**
   - The form scrolls down and **auto-populates ALL fields**:
     - **Invoice ID** → Generated uniquely from the requirement (e.g. `INV-REQ-34053`)
     - **Buyer Wallet Address** → Filled from the buyer's on-chain address
     - **Amount (MSTC)** → Filled from the requirement's budget
     - **Due Date** → Auto-calculated from the delivery date (days from today)
   - An alert summarizes the selected order details.
6. **Talking Point:** *"Every field is auto-populated from the buyer's requirement. The supplier doesn't need to type anything — reducing errors and ensuring data integrity."*
7. **Action:** Click **"Create Receivable"**.
8. **Behind the Scenes:** *"The frontend calls `createReceivable()` on the Smart Contract on the Hardhat blockchain. It mints an ERC-721 NFT Certificate, stores the invoice hash, amount, buyer address, and due date immutably on-chain."*
9. **Proof:** A green box shows the **Transaction Hash** and a **Read-back from Blockchain** section:
   - On-chain ID (e.g. `#1`), Invoice ID, Amount, Buyer address, Status: `CREATED`

---

## 🎬 Phase 3: Physical Logistics (The QR Code)

**Goal:** Show the physical-to-digital bridging.

1. **Action:** Scroll down to **"Your Active Receivables"** table. Click **"Refresh Data"** if needed. The receivable appears.
2. **Action:** Click the **"Print QR"** button on that row.
3. **Talking Point:** *"The physical goods are loaded onto a truck. We generate this QR code and attach it to the shipment. This QR encodes the receivable's on-chain ID and its cryptographic hash."*
4. **Action:** A new window opens with the QR code image.
5. **Action:** Scan the QR code with your mobile phone (routes through Ngrok).
6. **Action:** On your phone, click **"Confirm Delivery"**.
7. **Behind the Scenes:** *"The driver's scan calls `markDelivered()` on the smart contract, updating state from CREATED → DELIVERED. The physical asset is now cryptographically synced with the digital blockchain."*

---

## 🎬 Phase 4: Buyer Acceptance & Escrow Settlement

**Goal:** Close the loop and settle the transaction via on-chain Escrow.

1. **Action:** Go back to the **Buyer Portal** tab. Refresh the page.
2. **Action:** In the **"Lookup Receivable"** section, type the on-chain ID (e.g. `1`) and click **"Fetch Details"**.
3. **What Shows:** The Receivable Action Center displays on-chain data:
   - Invoice ID, Amount, Buyer address, Current Status
4. **Talking Point:** *"The Buyer sees the goods arrived and the blockchain confirms state is DELIVERED."*
5. **Action:** Click **"Accept"** (the accept button for BUYER_ACCEPTED).
6. **Behind the Scenes:** *"This calls `buyerAccept()` on the Smart Contract. Because the buyer proved they had sufficient MSTC upfront, this finalizes the Escrow. No middleman, no bank, no financier. Complete trustless B2B automation."*
7. **Proof:** Status updates to `BUYER_ACCEPTED`. Transaction hash is displayed.

---

## 🎬 Phase 5: The Fraud Catch (Tamper Demo)

**Goal:** Prove the system is un-hackable.

1. **Action:** Click **"Judge's Tamper Demo"** in the top navigation bar (or navigate to `/tamper`).
2. **Talking Point:** *"What if a supplier tries to doctor an invoice after fulfilling the order?"*
3. **Action:** Click **"Run AI Verification"** under **Scenario A (Authentic)** → Green: `HASH MATCH ✓`.
4. **Action:** Click **"Run AI Verification"** under **Scenario B (Doctored)** → Red: `HASH MISMATCH DETECTED ✗`.
5. **Explanation:** *"If even a single pixel is altered in the invoice, the SHA-256 hash mismatches the immutable blockchain hash. Fraud is mathematically impossible."*

---

## 🎬 Phase 6: The Secret Governance (Admin)

**Goal:** Show the secure architectural routing.

1. **Action:** Log out and type admin credentials: `admin@demo.agricredx.com` / `AgriCredX2026Demo!`.
2. **Talking Point:** *"We don't have a public admin login page for security. If an admin logs into any portal, the system's Row Level Security detects their role and routes them to the Protocol Admin Dashboard."*
3. **Action:** Show the **Protocol Admin Dashboard** (red-themed).
4. **Conclusion:** *"AgriCredX is fully functional, blockchain-native, AI-powered, and ready for deployment. Every transaction is cryptographically signed, every document is AI-verified, and every state change is immutably recorded on-chain. Thank you."*

---

## 🔧 Quick Troubleshooting

| Problem | Fix |
|---|---|
| "No active receivables found" | Click "Refresh Data" or hard-refresh (`Ctrl+Shift+R`) |
| Hardhat node not responding | Restart: `cd contracts` → `npx hardhat node` → redeploy |
| Port 8545 in use | Kill: `npx kill-port 8545` then restart |
| BridgeKey shows $0.00 balance | Normal — tMSTC has no market price. The tMSTC count is what matters |
| White screen / Supabase error | Check `apps/web/.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |
