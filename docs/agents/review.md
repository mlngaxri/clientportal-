# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest observed `main` before this handoff update: `3c2e952c2cc72c0183ef333b456ea5dc24abe7eb`.
- Validation run 196 for that SHA passed install, typecheck, unit/backend tests, isolated Supabase, production build, Chromium install and application startup, then failed in the shared connected customer-workflow browser step. Review-specific automated checks therefore ran successfully inside `npm test`, but the repository-wide exact-SHA gate is still red.
- Deployment for that SHA was skipped; no live or external-provider acceptance is claimed.

## Recent Review work
- `56528c3e62b284df303a434651720949e3075cd7`, `277035313208806f0ea63849fa5f1029ef7cbfaa`: enforce semantic revision completeness at the persistence boundary.
- `df4f726da3d2a46afa4942d12122c7cf5ab48a57`: prove rejected incomplete submission does not consume an allowance or persist a command receipt.
- `0eb39144cf25c4da568a4571b6aae77e86e9c419`: prove submit/withdraw replay does not double-consume or double-refund revision allowance.
- `08ea0f4af80a99b912fba6b29eb7dbcdd4424405`: protect accounting after operator work is locked.
- `c91b27d08f7ce3e9502459c27223ff7d3bec139e`: protect completion replay integrity and creation of the next draft.
- `b4f0af5b3773849f3662d62b3408fff970e74019`: cover revision-draft owner authorization.
- `c8efcac94270f286f7c2f1301448e91c874a5993`, `6f0e5b1dda16333299391933e1fdc3d842c60f4c`: protect completion-created drafts from stale save/submit commands.
- `3f1c590f18aab25ecba061e727410d8edaa9d61f`: protect withdrawn drafts from stale pre-withdraw saves/submissions.
- `5c32271ca45619bfe5776d3eae4aad286df2ef1e`, corrected for TypeScript narrowing by `f1a801300bc4dc95b6bd8d61df47994b0e880597`: prove a replayed successful withdrawal retains exactly one persisted receipt while stale fresh-key withdrawals cannot refund again or roll back newer resubmitted intent.
- Recent UI hardening makes annotation/revision actions form-safe, exposes the keyboard-editable annotation surface with interactive semantics, and announces revision submission progress. These are source/automated contracts only, not external review acceptance.

## Evidence grade
**S0 — Source.** The repository-wide validation gate on the latest observed parent SHA is red in the connected-browser workflow, so this handoff does not promote the current source to S1. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must roll back state/accounting and must not create successful command receipts. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
Once the shared connected-browser gate is green, inspect the post-withdraw/resubmit path at the operator lock boundary: add a focused regression proving a stale `start_revision` command carrying the pre-withdraw/pre-resubmit project version cannot lock the newly resubmitted customer revision, mutate its board state, or create a command receipt. This is the next unproven transition adjacent to the now-covered customer-side stale withdrawal/replay invariants.
