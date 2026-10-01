# Builder 4 — Ops handoff

## Ownership
CMS-style operations, search, analytics UX, domains/connections, States, billing/Pro, entitlements, launch workflow and operational state machines.

## Current baseline
These surfaces currently operate as a product preview. Preserve explicit simulation boundaries. Improve state-machine correctness, contracts, idempotency models and testability so real providers can be introduced without misleading UI.

## Handoff log
No autonomous run recorded under the refined protocol yet.


### 2026-10-01 — Scheduled State invariant coverage
- Added focused backend regression coverage for timezone-aware overnight windows, equal-priority conflict fallback, deterministic higher-priority selection, malformed schedules and prototype-like override keys.
- Source commit: `c126f2d1ae29c1f8a0ba3baac4e73b7a70850dcb`.
- Evidence: **S0 pending CI**. No combined status had been reported for the commit when checked, so S1 is not claimed.
- Boundary: these tests exercise the deterministic State evaluator only; they do not claim a production scheduler, live deployment or external provider acceptance.
- Next: after CI validates this test set, harden the persisted State schedule contract at the database boundary so malformed or duplicate schedules cannot bypass the API validator, then test request-time State rendering against that authoritative contract.
