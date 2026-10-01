# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Handoff log
No autonomous run recorded under the refined protocol yet.


### 2026-10-01 — Session lifetime policy
- Centralized deterministic session lifetime calculation in `lib/auth-session.ts`.
- Added backend tests for lifetime selection, expiry validation and browser-session versus remembered-cookie policy.
- Source commits: `2cb62c9ed3e579baf743dad0daf25b48a8cf37e6`, `497c330ff416404f1294506306ac986876e0bd6a`.
- Evidence: **S0**. CI had not reported a status at handoff time, so S1 is not claimed.
- Next: adopt the shared lifetime helper across sign-in and callback paths and add route-level regression coverage.


### 2026-10-01 — Auth policy adoption audit
- Re-read the current auth route, callback, session helper, middleware and the latest authentication commits after parallel work landed.
- Confirmed commit `b10208e74525e8bd1436961f071f19d7c4271bb3` now issues the signed session lifetime proof only after successful password authentication or callback exchange, preserves the PKCE verifier during expired-session cleanup, and checks that a failed sign-in cannot extend an existing proof.
- Identified remaining policy drift: `app/api/auth/route.ts` and `app/auth/callback/route.ts` still duplicate the 8-hour/30-day expiry arithmetic instead of calling the tested `sessionExpiry()` helper.
- Attempted the bounded helper adoption plus deterministic cookie-lifetime/test hardening, but the connected GitHub write safety layer rejected source/test writes. No source behavior change or S0 claim is made for those attempted edits.
- Evidence: the prior auth hardening is present in source, but no combined CI status was reported for `b10208e7` when checked, so this run does not promote it beyond its existing evidence.
- Next: replace both duplicated expiry calculations with `sessionExpiry(remember)`, add route-level/static regression coverage that prevents policy drift, and rerun the auth/backend suite. Do not alter the successful-auth proof ordering introduced by `b10208e7`.

### 2026-10-02 — Restore database regression type safety
- Current `main` validation failed at `npm run typecheck` before tests/build because the persisted-State regression block called `ok()` and incremented `checks` before those declarations were initialized.
- Moved the shared assertion counter/helper immediately after database construction, before any State assertions, without changing the State contract or production behavior.
- Source commit: `01c14e479bb8dc090bdc92232949b06ce7cedf56`.
- Evidence: **S0 pending CI**. The previous exact-main validation failed at typecheck; a validation run for this repair was not yet visible when the handoff was written, so S1 is not claimed.
- Blocker/regression status: this removes the known repository-wide compile blocker that had prevented all backend tests, Supabase startup, build and browser acceptance from running. Those later stages still require a fresh successful workflow.
- Next: once CI is green through the repaired database suite, return to the auth policy drift item: adopt `sessionExpiry(remember)` in both auth entry paths with route-level regression coverage.
