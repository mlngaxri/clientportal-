# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Exact-SHA validation run 223 on `44b2e20ac6795482cbcb46e5414f40c121f51c22` is green end to end: install, typecheck, unit/backend tests, isolated real Supabase, production build, Chromium, connected production application startup, and the real accounts/storage/CMS/customer browser workflow all passed.
- The recovery blocker was acceptance-environment cookie-host collision, not a reason to weaken the application auth boundary. The disposable app/callback now uses `http://localhost:4173` while local Supabase remains on `127.0.0.1`; host-scoped PKCE cookies therefore remain isolated as they are across real application/provider hosts.
- `tests/recovery-origin.test.mjs` locks the host-isolation invariant while still requiring the recovery callback to return to the same app origin that initiated it.
- Evidence: **S1 — Automated** for the connected recovery path on exact SHA `44b2e20a`. The workflow's connected browser journey also passed, but this handoff conservatively records the automated gate; no external hosted Supabase/Auth provider acceptance is claimed.
- Next: with the red recovery workflow cleared, resume Core's ladder at security/integrity review: inspect one under-tested authorization/RLS or mutation boundary and add the smallest regression/fix that proves it fails closed.

## Prior relevant work
- `44b2e20ac6795482cbcb46e5414f40c121f51c22`: isolate acceptance app PKCE cookies from the local Supabase Auth host; exact-SHA validation run 223 passed the complete connected browser workflow.
- `00003f0830dfc1f2910086223ec17b41ca3871e9`: allow encoded recovery callback redirects in local Supabase acceptance configuration.
- `9c5564df5a8168c00347a927119394f42f6252ea`: add safe successful-exchange/session-handoff recovery diagnostics.
- `7fa74a973cd15ccd77119bfa19027419f9cff52e`: expose safe failure-only callback diagnostics.
- `b1264f9b55b0c5ddcbcc7b25a118bf8dd4ecb802`: keep stale Supabase auth tokens gated during PKCE callback; the verifier remains readable through the normal pre-proof filter.
- `5320934b5a45f881aea392bba810d2778c668bb4`: attempted to preserve the PKCE verifier through callback, but did so by broadly bypassing pre-proof Supabase cookie gating; superseded by the later hardening.
- `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`: keep local acceptance auth cookies usable in production builds when `APP_ENV=development`.
- `44dfc6fa3e81ab7b0108d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Customer Supabase sessions no longer depend on the service-role credential.
