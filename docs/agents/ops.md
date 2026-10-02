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

### 2026-10-02 — Repair withdrawn-revision regression truthfulness
- Validation run 137 failed at `npm test` after typecheck passed; Supabase, build and browser stages were consequently skipped.
- The newly added withdrawal conflict regression expected `submitted_data` to retain the submitted snapshot after withdrawal, but the persisted command contract intentionally clears `submitted_data` when reopening the revision draft. The stale-write/refund invariant was otherwise aimed at the correct board-version boundary.
- Updated the regression to require the authoritative post-withdraw state: draft data is preserved, `submitted_data` is null, board version remains advanced, the refunded allowance remains unchanged, and the stale command creates no receipt. A current-version save must continue to leave `submitted_data` null.
- Source commit: `d0fb4981f66b6526512e6aebdf83cccd2312edb2`.
- Evidence: **S0 pending fresh CI**. Run 137 is failure evidence for the parent regression, not proof for this repair.
- Boundary: this repairs automated test truthfulness only; it does not claim deployment, billing, publishing or external-provider acceptance.
- Next: after CI clears, return to State activation replay and verify a pinned release cannot silently follow later draft edits.

### 2026-10-03 — State activation replay after draft edits
- Extended the State release regression so an idempotent replay of the original activation request is exercised after the draft board has changed. The replay must return the original release snapshot and the persisted public release must remain pinned to the activated State rather than following later draft edits.
- Evidence: **S0 pending fresh CI**. The parent `main` run 162 passed typecheck and `npm test` but failed while starting isolated real Supabase, so build/browser stages were skipped; that failure is not proof for this change.
- Boundary: this strengthens source-level State activation/idempotency evidence only. It does not claim production scheduling, publishing, deployment or provider acceptance.
- Next: after CI validates this regression, inspect activation with a reused idempotency key whose request differs after a draft edit and ensure it continues to fail without mutating the pinned release.

### 2026-10-03 — State activation idempotency mismatch coverage
- Extended the State activation regression after a draft edit so reusing the original activation key with the newer board version must fail as a different request, while the pinned release remains unchanged and exactly one receipt exists for that key.
- Evidence: **S0 pending fresh CI**. Current main validation run 167 is green for the parent `94a5c8f56e5dc7a82fee5800b740ae63db70a0cb`; this new commit requires exact-SHA validation before S1.
- Boundary: source-level idempotency/state-release coverage only; no production scheduling, publishing, billing, deployment or external-provider acceptance is claimed.
- Next: inspect Pro entitlement loss after activation and prove request-time rendering falls back to usual content without deleting or mutating the pinned release snapshot.

### 2026-10-03 — Billing workspace project-switch isolation
- Reconciled source commit `a26c3d159e79032cffa1763471f66a13c10252ed`, which clears payment receipts, subscription records, the open receipt dialog and billing-portal loading state before each project-scoped billing refresh. Its focused regression requires those resets to occur before the new project's billing request, preventing stale commerce records from being shown under another project.
- Evidence: **S1 — Automated for the billing change.** Validation run 202 on current `main` passed typecheck, `npm test`, isolated Supabase startup and the production build; the later connected-browser failure is in password recovery, not this billing invariant.
- Current blocker: run 202 fails only in the final connected-browser password-recovery check while waiting for the New password field. Builder 5/Core own that cross-cutting auth release blocker; no billing/provider failure is evidenced by the run.
- Boundary: this proves the billing isolation source and its automated regression on a descendant SHA only. It does not claim Stripe acceptance, live deployment or provider behavior.
- Next: inspect Pro entitlement loss after State activation and prove request-time rendering falls back to usual content without deleting or mutating the pinned release snapshot.
