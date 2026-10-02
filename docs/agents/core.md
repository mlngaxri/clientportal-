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

### 2026-10-03 — Keep recovery callback URL valid without APP_URL
- Current `main` validation run 170 was green before this change.
- Found the recovery route interpolated `process.env.APP_URL` directly, unlike other auth entry paths; an absent APP_URL therefore produced an invalid `undefined/auth/callback...` provider redirect instead of using the request origin.
- Recovery now builds the callback with `new URL()` using APP_URL when configured and the request origin otherwise, while preserving the password-reset return path.
- Added auth-policy regression coverage for the absolute callback construction and removal of direct APP_URL interpolation.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: inspect recovery-session privilege scoping before password-update completion, or another concrete auth integrity boundary.

### 2026-10-03 — Normalize signup callback construction
- Audited auth provider handoffs after the recovery callback fixes and found signup still built `emailRedirectTo` by string concatenation while Google, confirmation resend and recovery use URL construction.
- A configured `APP_URL` with a trailing slash could therefore produce a double-slash callback path and miss the provider redirect allowlist.
- Signup now builds the callback with `new URL()`, preserves the sanitized `next` parameter via `URLSearchParams`, and has regression coverage preventing direct APP_URL interpolation from returning.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: inspect recovery-session privilege scoping before password-update completion, or another concrete auth integrity boundary.

### 2026-10-03 — Preserve auth callback cookie origin
- Connected validation remained red in password recovery after the loopback callback was allowlisted. The callback exchanged the code on the request host, then redirected through `APP_URL`; when acceptance entered through `127.0.0.1` but APP_URL named `localhost`, host-only Supabase session cookies were lost before `/account/password` loaded.
- Successful and failed auth callbacks now redirect on the callback request origin. Provider callback generation still uses configured APP_URL where appropriate; only the post-exchange browser navigation preserves the cookie-owning host.
- Added regression coverage locking request-origin redirects and preventing APP_URL from being reintroduced into the post-exchange redirect.
- Evidence: **S0 pending fresh CI**. No external Supabase/Auth acceptance is claimed.
- Next: verify the connected recovery journey on this exact SHA; then inspect recovery-session privilege scoping or another concrete auth integrity boundary.
