# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-04
- Tightened `public_site_available(uuid,text)`, a `SECURITY DEFINER` public-route availability RPC, from the original `anon,authenticated,service_role` grant to the exact public/server roles: `anon` and `service_role`. Authenticated customer sessions no longer receive an unnecessary public-routing execution capability.
- Added executable PGlite regression coverage applying the real connected-site migration plus the forward privilege migration and asserting `anon=true`, `authenticated=false`, `service_role=true`.
- Evidence: **S0 — Source** until exact-SHA automated validation is observed. No hosted Supabase or deployed-route acceptance is claimed.
- Next: continue the `SECURITY DEFINER` audit for public/server RPCs, especially functions whose intended caller role is broader than their actual runtime contract; prefer executable privilege regression coverage and only change production logic for a concrete least-privilege defect.

## Prior relevant work
- `583173ff6fa74bfc9b4fecb0615eb6246d1e2221`: restrict public domain resolution to `anon` and `service_role` with executable privilege regression coverage.
- `7619d7cc710cc0b032817dcfb565311c22ccd29a`: restrict notification claiming to `service_role` with executable privilege regression coverage.
- `62d041273f95a0691c07956f8322e0f35e65bf4e`: executable authorization/no-side-effect regression for connection settings.
- `73db712fde3090d9b6cb2c874f5605ce219fe0a7`: executable authorization/no-side-effect regression for domain reservation.
- `f60db59a4f746dc594101a924d0fb202d8cd86fa`: executable authorization/idempotency regression for onboarding project creation.
- `abade8b9512e5b1cbda6b053818e4126fb9e7afa`: executable authorization/no-side-effect regression for project settings (fixture repaired by `66f158865c569936a09e0e78ba9ffa0a1b577100`).
- `b0ce7fc04fa691442bc94021871212a867b4b591`: executable authorization/no-side-effect regression for State activation.
- `533498f38dd161fae7fa50f587e2d521108b1512`: executable authorization regression for customer revision commands.
- `6bf8fcbe32ee96ed157d8c3e42bfe0fef503e77d`: executable owner-scope and role coverage for `reserve_checkout`.
- `ee1dca8a34b403e417ed024d741f0ce5648b3d53`: executable privilege regression for server-only `record_subscription`.
- `568a733dd95473d77f7df97a900fde0497963c57`: restrict payment reconciliation to `service_role` with executable privilege regression coverage.
- `a01fc8e0ad6613e0129942a874eff6c8a103ea41`: restrict checkout rotation to `service_role`.
- `bbdf11818a4a1be439c83e6ac6483d8e40f9dca6`: fail closed when an expired unbound checkout reservation is first attached to a provider session while preserving idempotent same-session replay.
- `7eccef29bfd2476eca12fa91a09b8c0f39ac4f51`: fail closed on stale checkout rotation.
- `c125a1c4397e3045fbd261fcff95d04cf9c89180`: fail closed on equal-timestamp subscription conflicts.
- `6bd3a6d71a75a3c96e1382ef9d0c57d4b8b078f0`: execute trial entitlement regression coverage against the real forward migration.
- `321eeeabfe69589ea34e48f88b6e941a8517ce63`: restore Pro entitlement for Stripe `trialing` subscriptions via forward migration.
- `653c10b007d86b3ef5648b4692580182c6ebbb99`: require checkout `APP_URL` to be a canonical origin and build Stripe return URLs from parsed `URL.origin`.
- `c18579b6810f62f22508874b439124ae00ceea68`: cover the `set_form_status` authorization boundary so unrelated authenticated users fail closed while owners can transition their own submission.
- `44b2e20ac6795482cbcb46e5414f40c121f51c22`: isolate acceptance app PKCE cookies from the local Supabase Auth host; exact-SHA validation run 223 passed the complete connected browser workflow.
- Customer Supabase sessions no longer depend on the service-role credential.
