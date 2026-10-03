# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Closed a regression-evidence gap in the subscription entitlement fix: the backend commerce test now actually applies `019_subscription_trial_entitlement.sql` instead of only regex-checking its source.
- The executable lifecycle now proves a reserved `trialing -> active -> past_due` sequence keeps Pro entitlement during trial/active states, removes it on `past_due`, and rejects an older `active` event from restoring entitlement.
- Baseline evidence before this change: exact-SHA validation run 243 passed on `6d160025389ac5facd0ee7bde50b0b5d7a96a4ef`; the separate deploy workflow failed and remains Builder 5 release plumbing.
- Evidence: **S0 — Source** until exact-SHA validation runs for this commit. No Stripe provider acceptance is claimed.
- Next: inspect another under-tested payment/webhook invariant, prioritizing equal-timestamp subscription event ordering or checkout/session binding replay behavior.

## Prior relevant work
- `321eeeabfe69589ea34e48f88b6e941a8517ce63`: restore Pro entitlement for Stripe `trialing` subscriptions via forward migration.
- `653c10b007d86b3ef5648b4692580182c6ebbb99`: require checkout `APP_URL` to be a canonical origin and build Stripe return URLs from parsed `URL.origin`.
- `c18579b6810f62f22508874b439124ae00ceea68`: cover the `set_form_status` authorization boundary so unrelated authenticated users fail closed while owners can transition their own submission.
- `44b2e20ac6795482cbcb46e5414f40c121f51c22`: isolate acceptance app PKCE cookies from the local Supabase Auth host; exact-SHA validation run 223 passed the complete connected browser workflow.
- `00003f0830dfc1f2910086223ec17b41ca3871e9`: allow encoded recovery callback redirects in local Supabase acceptance configuration.
- `9c5564df5a8168c00347a927119394f42f6252ea`: add safe successful-exchange/session-handoff recovery diagnostics.
- `7fa74a973cd15ccd77119bfa19027419f9cff52e`: expose safe failure-only callback diagnostics.
- `b1264f9b55b0c5ddcbcc7b25a118bf8dd4ecb802`: keep stale Supabase auth tokens gated during PKCE callback; the verifier remains readable through the normal pre-proof filter.
- `5320934b5a45f881aea392bba810d2778c668bb4`: attempted to preserve the PKCE verifier through callback, but did so by broadly bypassing pre-proof Supabase cookie gating; superseded by the later hardening.
- `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`: keep local acceptance auth cookies usable in production builds when `APP_ENV=development`.
- `44dfc6fa3e81ab7b010b8d32d14f474ff7ca4227c`: keep recovery PKCE callback on the incoming request origin.
- `577ebea10a667b40db5037cdc963177e767ea23b`: scope password updates to recovery-purpose sessions with a domain-separated HMAC proof.
- `445e52fa3709a6c016b4bb0e956c1c986638712e`: preserve callback request origin so host-only Supabase cookies survive recovery navigation.
- Recovery callbacks are transient and clear stale remembered-session intent.
- Customer Supabase sessions no longer depend on the service-role credential.
