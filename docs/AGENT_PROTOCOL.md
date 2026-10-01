# Fourthform autonomous builder protocol

This repository is the shared source of truth for the five Fourthform builders.

## Current baseline

- The repository contains a polished interactive Fourthform client-portal preview.
- The preview is intentionally browser-local today. `README.md` and `docs/LOCAL_ACCEPTANCE.md` define the current product boundary.
- Production integrations such as Supabase, Google OAuth, Stripe, DNS mutation, analytics collection and customer-site publishing are not accepted merely because the preview simulates them.
- Canonical live targets:
  - Client portal: https://fourthform-client-portal.vercel.app/
  - Marketing: https://fourthform-marketing.vercel.app/
- The marketing source repository is not currently identified in this repository. Do not invent or overwrite marketing source. Treat the marketing URL as a read-only acceptance surface until its source is explicitly connected.

## Operating loop

Every builder run must:

1. Read the latest `main` commits, this protocol, `README.md`, `docs/LOCAL_ACCEPTANCE.md`, and its own handoff file.
2. Inspect relevant handoffs from the other builders before editing shared areas.
3. Choose one bounded, high-leverage task that can be completed and verified in the current run.
4. Work from the latest `main`. Never revert another builder's work to simplify your own task.
5. Implement the fix or improvement in source. Prefer small coherent changes over broad rewrites.
6. Run the strongest available tests for the changed behavior. Add regression coverage when practical.
7. Commit one cohesive change to `main` with a descriptive commit message.
8. Check the canonical live target only when a deployment containing the commit exists or when the run is explicitly a live regression check.
9. Update only your own handoff file with the commit SHA, evidence, blockers and next recommended work.
10. If an external credential or service blocks one acceptance tier, record it and immediately continue with the highest-value unblocked work. Do not disable the recurring builder because an integration is unavailable.

## Evidence tiers

Never collapse these tiers:

- **S0 — Source:** implementation exists in the repository.
- **S1 — Automated:** relevant static/unit/integration tests pass.
- **S2 — Local browser:** the interaction works in a local browser build.
- **S3 — Live Vercel:** the deployed commit is verified on the canonical URL.
- **S4 — External integration:** the real external service completed the operation and the result was verified.

A simulation can reach S2 but never S4.

## Coordination rules

- Builders 1–4 build. Builder 5 is the release/integration gate and may fix any cross-cutting defect.
- Builders 1–4 must not spend an entire run repeatedly checking Vercel deployment plumbing. Commit verified source progress and leave deployment gating to Builder 5.
- Pull/read the latest main state before each edit. If another builder changed the same file, preserve their behavior and integrate rather than overwrite.
- Keep the current visual language unless there is concrete evidence that a change improves consistency, accessibility or product intent.
- Do not migrate frameworks or replace major architecture merely for preference. Architecture changes need a concrete defect, migration path and regression evidence.
- Never commit secrets, production tokens, customer data or generated dependency folders.
- Never claim payment, authentication, DNS, analytics, publishing, upload scanning or server persistence succeeded unless the real provider confirms it.

## Current architectural direction

The preview currently stores state in the browser. Improve it incrementally rather than pretending it is already production-backed. Where production work is needed, introduce explicit provider/adaptor boundaries so the current preview continues working while future Supabase/Stripe/service implementations can replace the local providers without rewriting the UX.

## Release gate

Builder 5 owns release readiness. A change is release-ready only when the relevant source tests pass and the deployed commit can be identified. Builder 5 maintains cross-cutting security, accessibility, deployment and regression quality and must downgrade any acceptance claim whose evidence is missing.

## Self-sustaining behavior

A builder must not stop itself because one task is blocked. It should:

1. record the blocker once;
2. choose another task within its ownership;
3. prefer defects, missing regression tests and integration seams over cosmetic churn;
4. avoid repeating work already recorded as complete;
5. leave a precise next action for the following cycle.

When a workstream is genuinely complete, switch from feature creation to regression testing, simplification, accessibility, performance and defect discovery instead of inventing new scope.
