# AgriCredX 🌾

**Decentralized Trade Finance for Agricultural Supply Chains**  
**Team InnoVision**

---

## 📖 What is AgriCredX?

AgriCredX converts fragmented agricultural trade into a trustless, cryptographically-verified pipeline. Every receivable is minted as an **ERC-721 NFT certificate**. Escrow is enforced natively in the smart contract. The full workflow — from buyer procurement to payment release — happens on-chain with no intermediary.

We integrate **PyMuPDF + Grok AI** to perform fully automated data extraction and cryptographic hashing of trade documents (Invoices, POs, GRNs), anchoring their proofs onto the MST blockchain.

---

## 🌐 MST Blockchain Integration & Deployment

The AgriCredX smart contract has been fully deployed and verified on the **MST Testnet**. All frontend interactions (via MetaMask or BridgeKey) route transactions directly to this network.

*   **Network Name:** MST Testnet
*   **RPC URL:** `https://testnetrpc.mstblockchain.com`
*   **Chain ID:** `91562037`
*   **Currency Symbol:** `MSTC`
*   **Block Explorer:** `https://testnet.mstscan.com`

### 📜 Verified Smart Contract

*   **Contract Name:** `AgriCredX.sol`
*   **MST Testnet Address:** [`0xe54b70AbD908042397df609051Fe6a469cA34216`](https://testnet.mstscan.com/address/0xe54b70AbD908042397df609051Fe6a469cA34216)
*   *(Alternate / Previous Deployment)*: `0x1d1b3c2ad7eD58a15547b60c279Fad00954d4e6C`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Smart Contract** | Solidity (ERC721URIStorage) deployed on MST Testnet |
| **Wallet Integration** | BridgeKey / MetaMask / standard EVM Wallets |
| **AI Verification Engine** | Grok AI (xAI) & PyMuPDF (Invoice tampering detection) |
| **Backend & Auth** | Supabase (PostgreSQL, Row Level Security, Auth) |
| **Token Standard** | ERC-721 NFT Certificate per receivable |
| **Logistics Scanning** | Local/Ngrok tunnel for mobile delivery QR scanning |

---

## 🚀 Setup & Installation

Follow these steps to run the frontend application locally and connect it to the live MST Testnet deployment.

### 1. Prerequisites
Ensure you have `Node.js v18+` and `npm` installed.

### 2. Environment Variables
Create a file named `.env.local` inside the `apps/web/` directory:

```env
# Smart Contract Address on MST Testnet
VITE_AGRICREDX_CONTRACT_ADDRESS=0xe54b70AbD908042397df609051Fe6a469cA34216

# Supabase DB Configuration
VITE_SUPABASE_URL=https://nheljbbndmaplgcncfqi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AjuyQR9okk0p17HbIHe_1A_Q4fVqwUO
```

### 3. Start the Application
Run the following commands from the root directory:

```bash
# Install all dependencies across workspaces
npm install

# Start the frontend React (Vite) application
npm run dev --workspace=apps/web
```

The application will be accessible at `http://localhost:5173`.

### 4. MetaMask Configuration (Crucial for Demo)
To interact with the application, you **must** configure your MetaMask (or BridgeKey) wallet to connect to the MST Testnet:
1. Open MetaMask -> Settings -> Networks -> Add Network
2. Network Name: `MST Testnet`
3. New RPC URL: `https://testnetrpc.mstblockchain.com`
4. Chain ID: `91562037`
5. Currency Symbol: `MSTC`

---

## 🔄 The Smart Contract Workflow

1.  **Buyer Posts RFP:** Buyer creates a requirement in the Marketplace.
2.  **Supplier Sends Quotation:** Supplier selects the RFP and submits an on-chain transaction (`createReceivable`). Status: `QUOTATION_SENT`.
3.  **Buyer Accepts & Locks Escrow:** Buyer reviews the quotation and deposits the `MSTC` amount directly into the smart contract. Status: `BUYER_ACCEPTED`.
4.  **Supplier Uploads Docs:** Documents (Invoice, PO, etc.) are hashed and verified via AI, then anchored on-chain. Status: `DOCUMENTATION_UPLOADED`.
5.  **Logistics:** The status moves through `PACKED` → `IN_TRANSIT`.
6.  **Delivery & Auto-Payout:** The logistics agent scans the delivery QR code via mobile. The contract status becomes `DELIVERED`, and the **MSTC escrow is automatically released to the Supplier.**

---

## 🛡️ Protocol Admin & Governance
The Protocol Admin dashboard (`/admin`) connects directly to the blockchain to read real-time "Total Anchored Contracts" stats and can simulate suspending fraudulent users based on identity mappings.
