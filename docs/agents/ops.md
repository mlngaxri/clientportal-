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

### 2026-10-02 — Restore inbox enquiry heading semantics
- Current `main` validation run 87 passed install, typecheck, unit/integration tests, isolated Supabase startup, build and application startup, then failed the connected phone journey because the acceptance test could not find the visible enquiry name `Alex Visitor` by heading role.
- Restored level-2 heading semantics to each enquiry name inside the existing expandable inbox button without changing its visual treatment or interaction. This aligns the rendered accessibility tree with the existing connected-browser regression and makes message cards navigable by heading for assistive technology.
- Source commit: `b78fb0ebc3a2dddb9135b3395dd508fbbbd67cc1`.
- Evidence: **S0 pending fresh CI**. Run 87 is failure evidence for the parent state, not proof for this repair; S1 is withheld until validation completes on the repair commit.
- Boundary: this is an inbox accessibility/browser-regression repair. It does not claim email delivery, external provider acceptance or deployed production identity.
- Next: after CI clears this browser blocker, return to authenticated malformed-State save coverage proving HTTP/database rejection agreement without board mutation or command receipts.

### 2026-10-02 — Repair revision-command migration chain
- Validation run 101 failed `npm test` before Supabase/build/browser stages because migration 015 attempted to rename `project_command` to `project_command_validated`, but migration 008 already owns a function with that signature. Every fresh migration-backed test therefore stopped with PostgreSQL `42723` before exercising its invariant.
- Renamed migration 015's predecessor to the distinct `project_command_customer_validated` and routed its owner-only wrapper through that function, preserving migration 008's existing validation wrapper rather than replacing or bypassing it.
- Source commit: `dbda0402d8d7279b942422d086feeddc03f9267a`.
- Evidence: **S0 pending CI**. No workflow run existed for the repair commit when checked, so S1 is not claimed.
- Boundary: this repairs fresh migration application and preserves the revision authorization chain. It does not claim a live database migration, deployment, billing/provider acceptance or production State activation.
- Next: once CI confirms migrations and backend tests pass, return to authenticated malformed-State save coverage proving HTTP/database rejection agreement without board mutation or command receipts.

### 2026-10-02 — Repair stale next-draft regression contract
- Validation run 122 failed at `npm test` after typecheck passed; all Supabase/build/browser stages were skipped. The only source change since the last fully green validation was the new revision-completion regression.
- The regression incorrectly treated `save_board.expected` as a project version. The persisted command contract compares `expected` to the target board version for board actions, so its supposed current save used project version `3` against a draft at board version `0` and necessarily conflicted.
- Reworked the regression around the actual optimistic-concurrency boundary: save the completion-created next draft at board version 0, prove a second stale version-0 save conflicts without mutation or receipt, then prove a version-1 save succeeds.
- Source commit: `8b463c2bc9467dd0b983e880a100d3908c6bead4`.
- Evidence: **S0 pending fresh CI**. Run 122 is failure evidence for the parent test, not proof for this repair.
- Boundary: this repairs test truthfulness and preserves the existing board-version concurrency contract; it does not claim deployment or provider acceptance.
- Next: after CI clears, return to authenticated malformed-State save coverage proving HTTP/database rejection agreement without board mutation or command receipts.

### 2026-10-02 — Malformed State save boundary coverage
- Added a focused regression that locks the HTTP command route's friendly `validateStates()` rejection before the persistence RPC, then exercises the database State trigger through an authenticated `project_command` save on a live Pro project.
- The malformed `[null]` State payload must fail at persistence, leave the State board data/version unchanged, and create no command receipt, proving alternate writers cannot bypass the same fail-closed contract.
- Source commit: `343b8587cb4ea3f42549d41f9e0e5363bd3ac616`.
- Evidence: **S0 pending fresh CI**. No completed validation run for the source commit was available when recorded, so S1 is not inferred.
- Boundary: this is automated contract coverage only; it does not claim production State scheduling, publishing, deployment or external provider acceptance.
- Next: after CI confirms this regression, inspect State activation replay when a board changes after release to ensure the pinned release remains deterministic and cannot silently follow draft edits.
