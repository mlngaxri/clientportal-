# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Validation run 205 passes install, typecheck, unit/backend tests, isolated Supabase, build and application startup, then still fails only in the connected password-recovery journey waiting for the New password field; all preceding connected checks pass.
- The preceding PKCE change added an `allowTransientAuthCookies` bypass that exposed every Supabase auth cookie to the callback before a signed Fourthform session proof existed. That was broader than its stated purpose and did not fix recovery: the PKCE code-verifier cookie is not classified by `isAuthSessionCookie`, so it was already readable through the normal gated client.
- The callback now uses the normal gated `db()` path again. Stale Supabase session tokens remain hidden until `ff-session-until` verifies, while the transient PKCE verifier remains available for code exchange. Focused auth-policy coverage rejects reintroducing the broad bypass.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: use fresh connected evidence to isolate the still-red recovery exchange/navigation failure; do not broaden pre-proof cookie access again.

## Prior relevant work
- `5320934b5a45f881aea392bba810d2778c668bb4`: attempted to preserve the PKCE verifier through callback, but did so by broadly bypassing pre-proof Supabase cookie gating; superseded by the latest hardening.
- `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`: keep local acceptance auth cookies usable in production builds when `APP_ENV=development`.
- `44dfc6fa3e81ab7b0108d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Customer Supabase sessions no longer depend on the service-role credential.
