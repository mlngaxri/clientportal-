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

### 2026-10-02 — State API collection validation
- Replaced the `save_board` route's ad-hoc State array checks with shared `validateStates()` collection validation, so malformed entries such as `null` fail closed instead of throwing while duplicate IDs and the 100-State limit remain explicit invariants.
- Added focused regression coverage for valid collections, non-array input, malformed entries, duplicate IDs and oversized collections.
- Source commit: `6f1dd571aef98d77aafe30446f200f8e2929bc11`.
- Evidence: **S0 pending CI**. No combined status existed for the source commit when checked, so S1 is not claimed.
- Boundary: this hardens request validation and its contract with the persisted State trigger; it does not claim a live scheduler, publishing operation or external provider acceptance.
- Blockers: none for this source task; automated workflow evidence is pending.
- Next: add authenticated `save_board` route/integration coverage proving friendly API rejection and database-trigger rejection agree on malformed State payloads without mutating the board.

### 2026-10-02 — Explicit State activation contract regression
- Added backend regression coverage for the newly separated State release boundary: activation must use the dedicated release table/RPC, require a live Pro project, pin the exact board version, preserve request identity for idempotent replay, and persist the command receipt.
- Source commit: `12d921c1a5cd011bf24f1e881d2eaa446de584be`.
- Evidence: **S0 pending CI**. Workflow run 77 was pending when checked; S1 is not claimed. The local runner could not reach GitHub to materialize dependencies, so no local test result is substituted for CI.
- Boundary: this protects source-level activation semantics only. It does not claim a production scheduler, live publishing, billing entitlement, Vercel deployment or external provider acceptance.
- Blockers: none in product source; automated evidence is pending.
- Next: add authenticated malformed-State save coverage that proves both the HTTP validation boundary and database trigger reject the payload without changing the board version or creating a command receipt.
