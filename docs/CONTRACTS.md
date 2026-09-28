# Smart Contracts

For the 24-hour MVP, logical modules are consolidated into a single physical contract `AgriCredX.sol`.

## Roles
- `admin`: Contract deployer, can resolve edge cases.
- `verifierNode`: Authorized backend wallet for anchoring AI attestations.

## Lifecycle Methods
- `createReceivable(offchainId, buyer, amount)` -> Returns on-chain ID.
- `setVerified(id)` -> Only Verifier.
- `buyerAccept(id)` -> Only Buyer.
- `anchorAttestation(id, digest)` -> Only Verifier.
- `makeFinanceable(id)` -> Only Verifier.
- `fundReceivable(id, fundedAmount)` -> Financier.
- `markRepaid(id)` -> Buyer/Admin.
- `dispute(id)` -> Buyer.
