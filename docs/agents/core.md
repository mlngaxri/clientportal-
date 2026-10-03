# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Validation run 210 on `dabb788dd1d3cbb63b3a461936368a17e45895b5` passes install, typecheck, unit/backend tests, isolated Supabase, build, Chromium and application startup, then still fails only in the connected password-recovery journey waiting for the New password field; all preceding connected checks pass.
- The preserved application log only emitted generic `request_failed` categories, so it could not distinguish a missing callback code, Supabase PKCE exchange rejection, or a callback exception. That made another speculative auth-boundary change higher risk than adding safe diagnostic evidence.
- The auth callback now emits structured, non-secret failure evidence: `auth_callback_exchange_failed` with only Supabase's machine error code, `auth_callback_missing_code`, or `auth_callback_exception` with only the JavaScript error class. Provider messages, callback codes and tokens are never logged. Focused regression coverage locks that redaction boundary.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: inspect the next connected-system application log for the callback event and fix the now-identifiable recovery failure without broadening pre-proof cookie access.

## Prior relevant work
- `b1264f9b55b0c5ddcbcc7b25a118bf8dd4ecb802`: keep stale Supabase auth tokens gated during PKCE callback; the verifier remains readable through the normal pre-proof filter.
- `5320934b5a45f881aea392bba810d2778c668bb4`: attempted to preserve the PKCE verifier through callback, but did so by broadly bypassing pre-proof Supabase cookie gating; superseded by the later hardening.
- `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`: keep local acceptance auth cookies usable in production builds when `APP_ENV=development`.
- `44dfc6fa3e81ab7b0108d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Customer Supabase sessions no longer depend on the service-role credential.
