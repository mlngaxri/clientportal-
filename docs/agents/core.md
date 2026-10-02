# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Validation run 190 passed typecheck, unit/backend tests, isolated Supabase startup, build and application startup, then failed only in the connected password-recovery journey waiting for the New password field.
- The recovery request created Supabase's PKCE verifier on the incoming request host, but `resetPasswordForEmail` sent the email callback to `APP_URL` when configured. In acceptance that can cross from `127.0.0.1` to `localhost`, so the callback cannot read the host-bound PKCE verifier and code exchange fails.
- Recovery callback generation now always uses the request origin. The successful callback already preserves that same origin after exchange, keeping the full PKCE round trip on the cookie-owning host.
- Tightened `tests/backend/auth-policy-adoption.test.ts` to require request-origin recovery callback construction and reject APP_URL use in that boundary.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: verify the connected recovery journey and focused backend regression on the exact SHA; then inspect another concrete auth/data integrity boundary.

## Prior relevant work
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Signup and recovery provider callbacks use normalized absolute URLs.
- Customer Supabase sessions no longer depend on the service-role credential.
