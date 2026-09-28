# AgriCredX MST Testnet Deployment Manifest

**Network:** MST Testnet
**Chain ID:** 91562037
**RPC URL:** https://testnetrpc.mstblockchain.com
**Explorer:** https://testnet.mstscan.com

## Contract Details
* **Contract Address:** `0x1d1b3c2ad7eD58a15547b60c279Fad00954d4e6C`
* **Deployment Transaction Hash:** `0x1fd17b4db67a69355b0695102219fbbcb1d3c1625a8f6866a6e9b36189814188`
* **Deployer Address:** `0xACa2E99f1b9C7Efa871a09Efff828e52b2390B78`

## Application Transactions
* **Function:** `createReceivable(invoiceId, buyer, amount, dueDate)`
* **First TX Hash:** `0xa95798d8dcb43c5a77fcf35723a3107a0defee426835687d510ab1dc5fffc69c`
* **Status:** Confirmed
* **Explorer Link:** [View Transaction on MSTScan](https://testnet.mstscan.com/tx/0xa95798d8dcb43c5a77fcf35723a3107a0defee426835687d510ab1dc5fffc69c)

## Security
* Deployer private key is strictly isolated in `.env` and `.gitignore`.
* No hardcoded private keys exist in the repository.
* The frontend reads the testnet contract address dynamically via `VITE_AGRICREDX_CONTRACT_ADDRESS`.
