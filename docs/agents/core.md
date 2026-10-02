# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Handoff log

### 2026-10-03 — Decouple customer Supabase sessions from admin secret
- Audited `lib/server.ts` after the repository returned green on validation run 158.
- Found `db()` gated ordinary customer Auth/PostgREST sessions through `configured()`, while that guard also required `SUPABASE_SERVICE_ROLE_KEY`; this unnecessarily made customer sessions depend on an administrator credential that `createServerClient` never consumes.
- `configured()` now requires only the Supabase URL and anon key. `admin()` independently fails closed unless both the URL and service-role credential exist, preserving the privileged boundary.
- Added regression coverage in `tests/backend/auth-policy-adoption.test.ts` that prevents the customer guard from reacquiring the admin secret and requires the admin guard to retain it.
- Source/test commit: `eb060ada020c564838de14ef9f3ef880c0bab89e`.
- Evidence: **S0 pending fresh CI**. The preceding exact-main validation run 158 was green; no exact-SHA validation result for this change existed when checked.
- No external Supabase/Auth acceptance is claimed.
- Next: after CI covers this boundary, inspect password-update completion/recovery-session privilege behavior or another concrete auth integrity boundary.
