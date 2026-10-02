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

### 2026-10-02 — Adopt shared auth session expiry policy
- The latest complete validation on `025b0027cbb970bc6476da6d09f3cd905aee5358` passed the full repository workflow, clearing the earlier database/typecheck and UX-test blockers.
- Replaced duplicated 8-hour/30-day expiry arithmetic in both `app/api/auth/route.ts` and `app/auth/callback/route.ts` with the tested `sessionExpiry(remember)` policy helper. Successful-auth proof ordering remains unchanged.
- Added `tests/backend/auth-policy-adoption.test.ts` so both auth entry paths must consume `sessionExpiry()` and cannot reintroduce local lifetime constants/arithmetic.
- Source commits: `e5d9d966bf5635fb72ba3eaa84efd720f86752cc`, `79848a1c09f3a1aedf96b04e9a319006210828a9`, `765b64d2c344765d553617973c29001348825400`.
- Evidence: **S0 pending CI for the final tested source commit**. A validation run was already pending for the callback source commit when checked; no completed workflow yet covered the newly added regression test, so S1 is not promoted by inference.
- Blockers: none for this source-level policy adoption. No external auth-provider acceptance is claimed.
- Next: after CI validates the policy-adoption regression, inspect session cookie lifetime calculation for deterministic clock injection so expiry and persistent-cookie `maxAge` cannot diverge around boundary timing.

### 2026-10-02 — Deterministic remembered-cookie lifetime
- Made `sessionCookieOptions()` accept the same injectable clock model already used by `sessionExpiry()` and `sessionExpired()`, eliminating a hidden second `Date.now()` read when deriving remembered-cookie `maxAge` from a signed expiry.
- Strengthened `tests/backend/auth-session.test.ts` with exact deterministic `maxAge` assertions, including proof that a remembered expiry generated from a fixed clock yields exactly `REMEMBER_SECONDS` when cookie options use the same clock.
- Source commit: `b63472f533c7138efa27dcbff6b16cf87d1e2acd`.
- Evidence: **S0 pending CI**. The source and regression exist on `main`; no completed validation for this commit was available at handoff, so S1 is not claimed.
- Blockers: none in source. No external authentication-provider acceptance is claimed.
- Next: after CI validates this regression, inspect auth cleanup/cookie mutation call sites for another concrete session-integrity invariant rather than expanding the policy surface speculatively.

### 2026-10-02 — Stable middleware session clock
- Middleware now captures one request clock and passes it to both `verifiedSessionExpiry()` and `sessionCookieOptions()`, so proof validation and remembered-cookie refresh cannot disagree because of separate wall-clock reads around an expiry boundary.
- Extended `tests/backend/auth-policy-adoption.test.ts` to lock in that call-site invariant.
- Source commits: `dce63350b97df1a7be8850db5e6faaf3005e70f4`, `a181f5006b9f7693a27c64a40009caea180eaf74`.
- Evidence: **S0 pending CI**. The source and regression are on `main`; no completed validation covering the final test commit was available at handoff, so S1 is not claimed.
- Repository-wide note: the preceding `main` validation was already red in the connected browser journey on a stale billing acceptance locator, after earlier validation stages passed; this auth change does not claim to repair that unrelated release blocker.
- Next: once CI confirms the auth regression itself, inspect expired-session cleanup for cookie-name scoping and deletion semantics before changing policy further.

### 2026-10-02 — Scope expired-session cookie cleanup
- Tightened `isAuthSessionCookie()` so expired-session cleanup matches only Supabase `*-auth-token` cookies and their chunk suffixes instead of every cookie beginning `sb-`.
- Extended `tests/backend/auth-session.test.ts` to cover unchunked/chunked auth tokens, PKCE verifier preservation, and unrelated `sb-` cookie preservation.
- Evidence: **S1 automated on descendant `3a7be244ca82386fa9708e4a9081ebf3cccfe056`**. Its validation passed typecheck and the complete automated test step before the unrelated connected-browser billing locator failed.
- Boundary: this prevents middleware cleanup from deleting unrelated same-host `sb-` cookies. It does not change Supabase authentication/provider behavior, and no external auth acceptance is claimed.
- Next: inspect logout/sign-out cookie deletion for the same exact scoping and path semantics.

### 2026-10-02 — Lock logout cleanup ownership
- Audited `app/api/auth/route.ts` logout behavior: Supabase `signOut({ scope: "local" })` owns provider auth-token deletion, while Fourthform explicitly clears only `ff-remember` and `ff-session-until` after successful sign-out.
- Added a route-source regression in `tests/backend/auth-policy-adoption.test.ts` that locks this boundary and prevents future manual broad deletion of `sb-*` or unrelated cookies.
- Source commit: `3e58eeb20acc8af79c82a97e5ef3c4a9e4cd9445`.
- Evidence: **S0 pending CI** for the new regression. The immediately preceding `main` validation passed typecheck and all automated tests, then failed only in the unrelated connected-browser billing locator; no completed validation yet covers this new commit.
- No external authentication-provider acceptance is claimed.
- Next: after CI validates this regression, inspect account recovery/password flows for stale-session or return-path integrity gaps.
