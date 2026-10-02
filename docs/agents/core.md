# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Validation run 200 passes install, typecheck, unit/backend tests, isolated Supabase, build and application startup, then still fails in the connected password-recovery journey waiting for the New password field; signup now passes.
- Auth provider entry paths still allowed `APP_URL` to choose the callback host. That is unsafe for PKCE whenever the incoming request host differs from configured public origin: the verifier/session cookies belong to the request host, as already established for recovery.
- Google OAuth, signup confirmation/resend and signup email callbacks now use the incoming request origin consistently. Focused auth-policy regression coverage rejects reintroduction of `APP_URL` at that provider callback boundary.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: verify exact-SHA connected auth; if recovery remains red, use the preserved application/Supabase evidence to isolate exchange failure rather than changing callback hosts again.

## Prior relevant work
- `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`: keep local acceptance auth cookies usable in production builds when `APP_ENV=development`.
- `44dfc6fa3e81ab7b0108d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Customer Supabase sessions no longer depend on the service-role credential.
