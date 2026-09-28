# Contributing to AgriCredX

## Workflow

1. We use a monolithic repository with npm workspaces.
2. The canonical lifecycle and shared types live in `packages/shared-types`. Do NOT duplicate enum definitions.
3. The main branch is `main`.

## Developer Roles

- **Dev 1**: Modifies `contracts/`, `apps/web/`, and `packages/chain-client/`.
- **Dev 2**: Modifies `supabase/`, `services/ai/`, and `packages/document-schemas/`.

## Running the Project

1. Run `npm install` at the root.
2. Create `.env` from `.env.example`.
3. Use `npm run dev:web` and `npm run dev:contracts` to develop.
