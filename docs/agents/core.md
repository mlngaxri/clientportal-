# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
The current portal is an interactive browser-local preview. Do not represent localStorage behavior as server persistence. Prefer provider/adaptor seams and explicit contracts that preserve the preview while making future production integrations replaceable.

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
