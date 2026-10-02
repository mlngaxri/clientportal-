# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The repository contains interactive simulated Direction and Review flows. Strengthen real interaction behavior and invariants without pretending the live review bridge or external upload pipeline is already integrated.

## Handoff log
No autonomous run recorded under the refined protocol yet.


### 2026-10-01 — Prevent accidental empty revision submission
- Added a shared completeness rule for draft Review Directions: target-only/whitespace placeholders are incomplete, while explicit prose, committed assets, drawings and valid HTTP(S) references carry customer intent.
- Review now blocks submission while any empty Direction remains and tells the customer to finish or delete it. This prevents a placeholder pin from being frozen into a revision batch and consuming an entitlement accidentally through the normal UI.
- Added focused automated regression coverage for completeness classification.
- Evidence: **S0 pending CI** at commit creation; Builder 5 should promote to S1 only after the repository workflow passes.
- Boundary: this is a UX/invariant guard. The transactional database remains authoritative for revision accounting; no external review bridge or provider acceptance is claimed.
- Next: harden the server-side submit invariant so API clients cannot submit semantically empty Direction objects, then test replay/withdrawal against that validation.

### 2026-10-02 — Enforce revision completeness at persistence boundary
- Added migration `012_revision_direction_completeness.sql`, moving the Review completeness rule to a database CHECK boundary so direct RPC/API callers cannot consume a revision with target-only or whitespace-only Directions.
- The persisted rule matches the UI contract: trimmed prose, committed assets, non-empty drawings and HTTP(S) links carry customer intent. Historical rows are not retroactively rejected (`NOT VALID`), while every new/updated non-draft revision is enforced.
- Added `tests/backend/revision-submission-contract.test.ts` to prove empty submissions are rejected without changing DRAFT state and each supported intent form can persist as SUBMITTED.
- Source commits: `56528c3e62b284df303a434651720949e3075cd7`, `277035313208806f0ea63849fa5f1029ef7cbfaa`.
- Evidence: **S0 pending CI**. Validation run 36940741987 was pending at handoff; do not promote to S1 until it passes.
- Boundary: this proves source/database contract only. No external review bridge, upload provider or live deployment acceptance is claimed.
- Next: once CI is green, test the `project_command` submit/withdraw replay path specifically against an incomplete saved draft and verify revision entitlement remains unchanged after rejection.

### 2026-10-02 — Protect revision entitlement on rejected command submission
- Extended `tests/backend/revision-submission-contract.test.ts` through the real `project_command(..., 'submit_revision', ...)` transaction boundary for a semantically incomplete saved draft.
- The regression asserts rejection leaves the board `DRAFT`, leaves `submitted_data` null, preserves the pre-existing `revision_used` count, and does not persist an idempotency command receipt for the failed command. This protects both revision allowance accounting and retry semantics when the database completeness constraint aborts submission.
- Source commit: `df4f726da3d2a46afa4942d12122c7cf5ab48a57`.
- Evidence: **S0 pending CI**. No completed validation for this source commit was available at handoff, so S1 is not claimed.
- Boundary: no external review bridge, upload provider, deployment or live-provider acceptance is claimed.
- Next: add focused successful submit → idempotent replay → withdraw coverage proving a replay cannot double-consume an allowance and withdrawal refunds exactly one allowance before work is locked.

### 2026-10-02 — Protect revision accounting across replay and withdrawal
- Extended `tests/backend/revision-submission-contract.test.ts` through successful submit, same-key submit replay, withdrawal, and same-key withdrawal replay.
- The regression proves a successful submit increments `revision_used` exactly once, replay returns the original command result without another increment, withdrawal returns the board to `DRAFT` and refunds exactly one allowance, and withdrawal replay cannot refund again or advance the board version.
- Source commit: `0eb39144cf25c4da568a4571b6aae77e86e9c419`.
- Evidence: **S0 pending CI**. Do not promote to S1 until automated validation covers the source commit.
- Boundary: this is database transaction/idempotency evidence only. No external review/upload provider or live deployment acceptance is claimed.
- Next: cover the lock boundary: once `start_revision` marks work `IN_PROGRESS`/locked, owner withdrawal must fail without changing revision accounting or command receipts.

### 2026-10-02 — Protect revision accounting after work is locked
- Added `tests/backend/revision-lock-contract.test.ts` covering the real submit → operator `start_revision` → owner withdrawal path through `project_command`.
- The regression proves that once work is `IN_PROGRESS` and `locked_at` is set, owner withdrawal is rejected, the consumed allowance remains consumed, the board version does not advance, and the failed withdrawal creates no idempotency command receipt.
- Source commit: `08ea0f4af80a99b912fba6b29eb7dbcdd4424405`.
- Evidence: **S0 pending CI**. No completed status was available for the source commit at handoff, so S1 is not claimed.
- Boundary: database transaction/locking evidence only; no external review/upload provider or live deployment acceptance is claimed.
- Next: inspect completion/review-return behavior for stale or replayed operator commands, especially whether completing a locked revision can accidentally strand or duplicate the next draft revision.

### 2026-10-02 — Protect revision completion replay integrity
- Added `tests/backend/revision-completion-contract.test.ts` covering submit → operator start → operator completion, same-key completion replay, and a fresh-key stale completion attempt.
- The regression proves completion returns the project to `REVIEW`, leaves the completed board `DONE`, consumes exactly one revision allowance, preserves exactly one next `DRAFT` revision, records the successful completion command exactly once, and rolls back a stale fresh-key completion without a command receipt.
- Source commit: `c91b27d08f7ce3e9502459c27223ff7d3bec139e`.
- Evidence: **S0 pending CI**. No completed automated status was available for the source commit at handoff, so S1 is not claimed.
- Boundary: database transaction/idempotency evidence only; no external review/upload provider, deployment, or live-provider acceptance is claimed.
- Next: inspect the next-draft lifecycle after completion for customer save/submit conflict behavior, especially stale board versions across the `REVISION_IN_PROGRESS` → `REVIEW` transition.

### 2026-10-02 — Cover revision draft owner authorization
- Added regression coverage for migration `016_revision_draft_owner.sql`, which reserves revision-draft `save_board` commands for the project owner while preserving trusted operator start/completion duties.
- The test proves an operator save is rejected without changing board data/version or creating a command receipt, then proves the owner can save the same revision draft exactly once.
- Source test commit: `b4f0af5b3773849f3662d62b3408fff970e74019`.
- Evidence: **S0 pending CI**. The prior main validation passed typecheck, unit/integration tests, isolated Supabase and build but failed later in the shared connected-browser journey; no completed validation yet covers this new regression commit.
- Boundary: database authorization evidence only; no external review/upload provider or live deployment acceptance is claimed.
- Next: after CI covers this regression, inspect stale owner save behavior across completion-created next drafts and ensure an old board/version cannot overwrite the new customer draft.

### 2026-10-02 — Protect completion-created drafts from stale owner saves
- Extended `tests/backend/revision-completion-contract.test.ts` through the completion-created next draft and the real `project_command(..., 'save_board', ...)` boundary.
- The regression proves a customer save carrying the pre-completion project version is rejected as a conflict, leaves the new draft data/version unchanged, and creates no idempotency receipt; the same owner can then save successfully with the current post-completion version.
- Source test commit: `c8efcac94270f286f7c2f1301448e91c874a5993`.
- Evidence: **S0 pending CI**. The immediately preceding main commit `8b49acc7342e6fdf2eb5f70c2b6985e96b0d93dc` has a green validation run, but no completed workflow yet covers this new regression commit, so S1 is not inferred.
- Boundary: database conflict/revision integrity evidence only; no external review/upload provider or live deployment acceptance is claimed.
- Next: once CI covers this regression, inspect stale submit behavior on the completion-created draft so an old client cannot consume another revision allowance after the transition.
