# Security & Privacy Guidelines

## Confidentiality
AgriCredX operates in an enterprise context where pricing and volume data are highly sensitive.
- **NEVER** store raw documents on IPFS or public blockchain storage.
- **NEVER** write plaintext invoice amounts, company names, or item details to public blockchain events or state.
- **ALWAYS** use Supabase Row Level Security (RLS) to restrict document access to the specific Supplier and Buyer involved.

## Blockchain Trust Layer
The blockchain acts purely as a tamper-evident state machine and timestamp server.
- The `attestationDigest` is the ONLY representation of the invoice data on-chain.
- Wallet signatures from the Buyer are the ultimate proof of acceptance.

## Edge Function Security
Supabase Edge Functions interacting with the blockchain MUST keep their private keys secure in Supabase Secrets, NEVER committed to the repo.
