# API Contract

## Supabase Tables

All CRUD operations flow directly from the browser to Supabase using Row Level Security (RLS). No middleware server is used for standard data access.

## AI Service Endpoints

`POST /api/v1/verify`
- Purpose: Execute document extraction and rules verification.
- Auth: Requires service-to-service key (called from Supabase Edge Functions).
- See `@agricredx/shared-types` `VerificationRequest` and `VerificationResponse`.

## Edge Functions

- `verify-receivable`: Triggered when documents are uploaded. Calls the AI Service.
- `anchor-attestation`: Triggered after buyer acceptance. Uses admin wallet to sign and broadcast the on-chain attestation.
