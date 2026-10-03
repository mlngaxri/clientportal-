# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Validation run 215 on `1ff80540f182459ba287f11271d89e3c655e0ccc` passes install, typecheck, unit/backend tests, isolated Supabase, build, Chromium and application startup, then still fails only in the connected password-recovery journey waiting for the New password field; all preceding connected checks pass.
- The preserved application log contains no `auth_callback_exchange_failed`, `auth_callback_missing_code`, or `auth_callback_exception` event. That means the previous failure-only callback instrumentation still cannot distinguish a successful code exchange followed by session rejection from a recovery navigation that never reaches the callback.
- Recovery evidence now records a safe `auth_callback_exchanged` event with only the boolean recovery purpose after successful exchange, and `auth_recovery_session_missing` with only the JavaScript error class if the password page rejects the resulting session. Authorization codes, tokens, account data and provider messages remain excluded. Focused regression coverage locks that boundary.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: inspect the next connected-system application log. If `auth_callback_exchanged` is followed by `auth_recovery_session_missing`, fix session-cookie persistence/verification; if neither callback event appears, inspect the local email verification redirect/link extraction path instead of changing callback session policy.

## Prior relevant work
- `7fa74a973cd15ccd77119bfa19027419f9cff52e`: expose safe failure-only callback diagnostics; run 215 proved that evidence was insufficient because no failure event was emitted.
- `b1264f9b55b0c5ddcbcc7b25a118bf8dd4ecb802`: keep stale Supabase auth tokens gated during PKCE callback; the verifier remains readable through the normal pre-proof filter.
- `5320934b5a45f881aea392bba810d2778c668bb4`: attempted to preserve the PKCE verifier through callback, but did so by broadly bypassing pre-proof Supabase cookie gating; superseded by the later hardening.
- `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`: keep local acceptance auth cookies usable in production builds when `APP_ENV=development`.
- `44dfc6fa3e81ab7b0108d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Customer Supabase sessions no longer depend on the service-role credential.
