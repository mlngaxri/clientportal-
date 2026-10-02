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
- Confirmed successful-auth proof ordering and identified duplicated session expiry policy in auth entry paths; source writes were blocked during that run.
- Next: adopt the shared helper without altering successful-auth proof ordering.

### 2026-10-02 — Restore database regression type safety
- Moved the persisted-State regression assertion helper before first use, removing the repository typecheck blocker without changing production behavior.
- Source commit: `01c14e479bb8dc090bdc92232949b06ce7cedf56`.
- Evidence: **S0 pending CI** at handoff.

### 2026-10-02 — Adopt shared auth session expiry policy
- Replaced duplicated expiry arithmetic in both auth entry paths with `sessionExpiry(remember)` and added policy-adoption regression coverage.
- Source commits: `e5d9d966bf5635fb72ba3eaa84efd720f86752cc`, `79848a1c09f3a1aedf96b04e9a319006210828a9`, `765b64d2c344765d553617973c29001348825400`.
- Evidence: **S0 pending CI** at handoff.

### 2026-10-02 — Deterministic remembered-cookie lifetime
- Made `sessionCookieOptions()` use an injectable clock and strengthened exact `maxAge` regression coverage.
- Source commit: `b63472f533c7138efa27dcbff6b16cf87d1e2acd`.
- Evidence: **S0 pending CI** at handoff.

### 2026-10-02 — Stable middleware session clock
- Middleware now uses one request clock for session-proof verification and remembered-cookie refresh.
- Source commits: `dce63350b97df1a7be8850db5e6faaf3005e70f4`, `a181f5006b9f7693a27c64a40009caea180eaf74`.
- Evidence: **S0 pending CI** at handoff.

### 2026-10-02 — Scope expired-session cookie cleanup
- Tightened expired-session cleanup to Supabase auth-token cookies and chunk suffixes while preserving PKCE and unrelated `sb-` cookies.
- Evidence: **S1 automated on descendant `3a7be244ca82386fa9708e4a9081ebf3cccfe056`**.

### 2026-10-02 — Lock logout cleanup ownership
- Added a route-source regression ensuring Supabase owns provider token cleanup while Fourthform clears only its own session-proof cookies.
- Source commit: `3e58eeb20acc8af79c82a97e5ef3c4a9e4cd9445`.
- Evidence: **S0 pending CI** at handoff.

### 2026-10-02 — Keep password recovery sessions transient
- Recovery callbacks now force transient policy and clear stale remembered-session intent while preserving remembered OAuth callbacks elsewhere.
- Source commits: `44763d69c8e84017d01348967f521489ff0215d8`, `30eeb67690c487efb702c46185a17b55af050b33`.
- Evidence: **S0 pending CI** at handoff.

### 2026-10-03 — Decouple customer Supabase sessions from admin secret
- Validation run 158 was green on the preceding exact `main` SHA.
- Found `db()` gated ordinary customer Auth/PostgREST sessions through `configured()`, while that guard also required `SUPABASE_SERVICE_ROLE_KEY`; the customer server client does not consume that administrator credential.
- `configured()` now requires only the Supabase URL and anon key. `admin()` independently fails closed unless both URL and service-role credential exist.
- Added regression coverage preventing customer configuration from reacquiring the admin secret and requiring the privileged client to retain it.
- Source/test commit: `eb060ada020c564838de14ef9f3ef880c0bab89e`.
- Evidence: **S0 pending fresh CI**. No exact-SHA validation result existed when checked.
- No external Supabase/Auth acceptance is claimed.
- Next: after CI, inspect password-update completion/recovery-session privilege behavior or another concrete auth integrity boundary.
