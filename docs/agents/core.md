# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
Derive the current boundary from latest `main`: the repository contains both the browser-local preview and a connected Next.js/Supabase customer application. Never promote local preview behavior to provider acceptance; grade connected behavior only to evidence actually observed.

## Latest handoff — 2026-10-03
- Completed the remaining subscription side of the commerce `SECURITY DEFINER` privilege audit with executable regression coverage: `record_subscription` must be inaccessible to `anon` and `authenticated` and executable only by `service_role`.
- This complements commit `568a733dd95473d77f7df97a900fde0497963c57`, which restricted `record_payment` to the same trusted server boundary, and the existing restrictions on `bind_checkout` and `rotate_checkout`.
- The regression applies the real commerce + subscription forward migrations in PGlite and checks PostgreSQL function privileges directly, so a later migration that accidentally restores PUBLIC/browser execute will fail tests.
- Evidence: **S0 — Source** until exact-SHA validation runs for this commit. No Stripe or hosted Supabase provider acceptance is claimed.
- Next: inspect the customer-callable checkout reservation boundary (`reserve_checkout`) for explicit least-privilege grants and cross-project/authentication invariants, fixing only a concrete defect or evidence gap.

## Prior relevant work
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
