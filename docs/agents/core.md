# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Found the password-update API accepted any authenticated Supabase session; the recovery URL selected the password UI but no server-side recovery-purpose proof survived the callback.
- Added a domain-separated HMAC recovery proof (`fourthform-recovery`) issued only after a successful recovery callback exchange. Password mutation now requires that unexpired proof and consumes it only after Supabase accepts the password update.
- Ordinary session proofs cannot validate as recovery proofs because the HMAC purpose is distinct.
- Added `tests/backend/recovery-privilege.test.ts` to lock issuance, verification-before-mutation, domain separation and post-success consumption.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: verify the connected recovery journey and focused backend regression on the exact SHA; then inspect another concrete auth/data integrity boundary.

## Prior relevant work
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Signup and recovery provider callbacks use normalized absolute URLs.
- Customer Supabase sessions no longer depend on the service-role credential.
