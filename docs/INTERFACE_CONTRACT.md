# Interface Contract

This defines the contract between the frontend, backend, and blockchain components. The single source of truth is the `@agricredx/shared-types` package.

## Canonical Lifecycle Enums

All components MUST use the following ordered lifecycle:

```typescript
export enum ReceivableStatus {
  CREATED = 'CREATED',
  VERIFIED = 'VERIFIED',
  BUYER_ACCEPTED = 'BUYER_ACCEPTED',
  ATTESTED = 'ATTESTED',
  FINANCEABLE = 'FINANCEABLE',
  FUNDED = 'FUNDED',
  OUTSTANDING = 'OUTSTANDING',
  REPAID = 'REPAID',
  CLOSED = 'CLOSED',
  DISPUTED = 'DISPUTED'
}
```

## Attestation Serialization

The digest anchored on the blockchain must be calculated identically in both frontend and backend using `AttestationPayload`.

1. Sort JSON keys alphabetically.
2. Remove spaces.
3. Serialize to string.
4. Calculate SHA-256 (or Keccak256).

## API Endpoints

- `POST /api/v1/verify` (AI Service): Accepts document URLs, returns VerificationResponse.
- Supabase endpoints are accessed via the `supabase-js` client using typed interfaces from `@agricredx/shared-types`.
