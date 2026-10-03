# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Closed a checkout-rotation integrity gap: `rotate_checkout` previously returned success when its reservation key was stale or mismatched, leaving the old provider-bound reservation active while callers could believe it had been invalidated.
- Forward migration `021_checkout_rotation_fail_closed.sql` now raises `Checkout reservation mismatch` when the targeted reservation was not rotated. Successful rotation still atomically changes the key, clears provider session/subscription bindings and renews expiry under the existing project row lock.
- Added an executable PGlite regression proving a stale key fails without mutating the existing bound intent and the correct key still rotates and clears its session binding.
- Recent parallel Core coverage also locks checkout session rebinding: an already-bound reservation accepts an idempotent repeat but rejects a different session ID.
- Evidence: **S0 — Source** until exact-SHA validation runs for this commit. No Stripe provider acceptance is claimed.
- Next: inspect checkout reservation expiry enforcement or webhook/provider receipt binding for another concrete fail-closed integrity gap.

## Prior relevant work
- `c125a1c4397e3045fbd261fcff95d04cf9c89180`: fail closed on equal-timestamp subscription conflicts.
- `6bd3a6d71a75a3c96e1382ef9d0c57d4b8b078f0`: execute trial entitlement regression coverage against the real forward migration.
- `321eeeabfe69589ea34e48f88b6e941a8517ce63`: restore Pro entitlement for Stripe `trialing` subscriptions via forward migration.
- `653c10b007d86b3ef5648b4692580182c6ebbb99`: require checkout `APP_URL` to be a canonical origin and build Stripe return URLs from parsed `URL.origin`.
- `c18579b6810f62f22508874b439124ae00ceea68`: cover the `set_form_status` authorization boundary so unrelated authenticated users fail closed while owners can transition their own submission.
- `44b2e20ac6795482cbcb46e5414f40c121f51c22`: isolate acceptance app PKCE cookies from the local Supabase Auth host; exact-SHA validation run 223 passed the complete connected browser workflow.
- `00003f0830dfc1f2910086223ec17b41ca3871e9`: allow encoded recovery callback redirects in local Supabase acceptance configuration.
- `9c5564df5a8168c00347a927119394f42f6252ea`: add safe successful-exchange/session-handoff recovery diagnostics.
- `7fa74a973cd15ccd77119bfa19027419f9cff52e`: expose safe failure-only callback diagnostics.
- `b1264f9b55b0c5ddcbcc7b25a118bf8dd4ecb802`: keep stale Supabase auth tokens gated during PKCE callback; the verifier remains readable through the normal pre-proof filter.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- Customer Supabase sessions no longer depend on the service-role credential.
