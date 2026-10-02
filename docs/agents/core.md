# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Validation run 195 passes install, typecheck, unit/backend tests, isolated Supabase, build and application startup, then fails at the first connected-browser signup check: after Create account it never reaches Business name. The preserved app log records one failed request during that check.
- Acceptance intentionally runs `next start` (therefore `NODE_ENV=production`) against disposable HTTP loopback services with `APP_ENV=development`. Session cookie policy previously keyed `Secure` only from `NODE_ENV`, so the local HTTP auth session could be rejected by the browser after acceptance moved to the exact `127.0.0.1` Supabase callback origin.
- Session cookies now remain non-Secure only for explicit `APP_ENV=development`; production/non-development behavior remains Secure. Focused auth-session coverage locks both sides of that boundary.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: verify the connected signup and recovery journeys on the exact SHA; if green, inspect another concrete auth/data integrity boundary.

## Prior relevant work
- `44dfc6fa3e81ab7b0108d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Signup and recovery provider callbacks use normalized absolute URLs.
- Customer Supabase sessions no longer depend on the service-role credential.
