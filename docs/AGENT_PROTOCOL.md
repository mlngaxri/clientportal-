# Fourthform autonomous builder protocol

This repository is the shared source of truth for the five Fourthform builders.

## Current baseline

- Always derive the current product state from the latest `main`, `README.md`, architecture/activation/release docs, tests and recent commits. Do not assume an old milestone is still current.
- The repository now contains both the independent browser-local preview and a connected Next.js customer application. Supabase-backed persistence/auth and provider adapters may exist in source; grade each capability only to the evidence actually available.
- `docs/LOCAL_ACCEPTANCE.md` is historical/local-preview evidence, not the authoritative boundary for the connected app.
- Canonical live targets:
  - Client portal: https://fourthform-client-portal.vercel.app/
  - Marketing: https://fourthform-marketing.vercel.app/
- Do not invent missing source, credentials, deployment identity or provider acceptance.

## Operating loop

Every builder run must:

1. Read the latest `main` commits, this protocol, `README.md`, its own handoff, relevant architecture/release/activation docs, and relevant other handoffs.
2. Inspect current CI/test status and recent failures when available.
3. Select ONE bounded, high-leverage task that fits the builder's ownership and can materially improve source, tests, evidence or release quality.
4. Work from the latest `main`. Never revert another builder's work merely to simplify your task.
5. Implement the smallest coherent improvement and add regression coverage where practical.
6. Run the strongest available validation for the changed behavior.
7. Commit one cohesive change to `main` with a descriptive message when writes are available.
8. Update only your own handoff with commit SHA, evidence tier, blockers and the next recommended action when writes are available.
9. Check canonical live targets only when the run is release-focused or a deployment containing the relevant commit can be identified.
10. Never disable or pause the recurring builder because work is blocked.

## Evidence tiers

- **S0 — Source:** implementation exists in the repository.
- **S1 — Automated:** relevant static/unit/integration checks pass.
- **S2 — Local browser:** the interaction works in a local browser build.
- **S3 — Live Vercel:** the deployed commit is identified and verified on the canonical URL.
- **S4 — External integration:** the real external provider completed the operation and the result was verified.

Never promote evidence by inference. A simulation can reach S2 but never S4.

## Coordination rules

- Builders 1–4 build within their specialist areas. Builder 5 is the release/integration gate and may fix cross-cutting defects.
- Pull/read latest `main` before edits. Integrate parallel work; do not overwrite it.
- Preserve the established visual/product language unless evidence supports a change.
- Avoid framework or architecture rewrites for preference. Require a concrete defect, migration path and regression evidence.
- Never commit secrets, production tokens, customer data or generated dependency folders.
- Never claim payment, authentication, DNS, analytics, publishing, malware scanning, storage, email or server persistence succeeded unless the appropriate real system confirms it.
- Builders 1–4 should not burn a run repeatedly checking deployment plumbing; Builder 5 owns release identity and production evidence.

## Infinite work ladder

The system must remain productive regardless of repository maturity. At the start of each run, choose the highest-value available item from this ladder and skip anything already proven complete:

1. **Red build / release blocker:** fix current typecheck, test, build, migration, browser or deployment failures.
2. **Recently changed code without regression coverage:** add the smallest meaningful regression test.
3. **Known handoff item:** complete an explicit next action that is still relevant.
4. **Security / authorization / integrity:** inspect trust boundaries, RLS, input validation, idempotency, race conditions, secret leakage and unsafe provider assumptions.
5. **Reliability:** stale writes, recovery, retries, transactionality, conflict handling, cleanup, error/empty/loading distinction and failure-state UX.
6. **Accessibility / responsive UX:** keyboard, focus, semantics, touch, narrow/wide layouts, reduced motion, contrast, status announcements and error recovery.
7. **Performance / maintainability:** remove duplication, tighten contracts, simplify code, reduce unnecessary client work, improve test speed and observability without speculative rewrites.
8. **Evidence debt:** strengthen CI, release provenance, deployed-SHA verification, deterministic fixtures, browser coverage and acceptance documentation.
9. **Product completeness:** compare actual implementation to current README/architecture/activation/release docs and close the highest-value truthful gap.
10. **Exploratory defect discovery:** inspect one under-tested route, state transition, provider adapter or user journey and either fix a concrete defect or add a regression that proves the invariant.

If source writes are temporarily rejected, DO NOT self-disable. Switch to read-only productive mode for that run: inspect current failures, review recent diffs, identify one concrete defect or missing invariant, produce an exact patch plan with file/function/test targets, and retry a write on the next scheduled cycle. Avoid repeating the same blocked patch on consecutive runs unless repository state changed.

When a feature area is mature, move down the ladder into regression testing, security, accessibility, performance, simplification and evidence quality. Never invent fake features merely to stay busy.

## Release gate

Builder 5 owns release readiness. A release is not accepted unless relevant source validation passes and the deployed commit can be identified. Green workflow UI is not deployment evidence when build/deploy steps were skipped. Builder 5 must fail closed on missing provenance and downgrade unsupported claims rather than hiding uncertainty.
