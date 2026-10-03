# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest parent inspected: `b1264f9b55b0c5ddcbcc7b25a118bf8dd4ecb802`.
- Validation run 206 passed the source/unit/build stages before failing in the shared connected customer-workflow browser step; the repository-wide gate remains red outside Review ownership.
- Deployment for that parent was skipped; no live or external-provider acceptance is claimed.

## Recent Review work
- `56528c3e62b284df303a434651720949e3075cd7`, `277035313208806f0ea63849fa5f1029ef7cbfaa`: enforce semantic revision completeness at the persistence boundary.
- `df4f726da3d2a46afa4942d12122c7cf5ab48a57`: prove rejected incomplete submission does not consume an allowance or persist a command receipt.
- `0eb39144cf25c4da568a4571b6aae77e86e9c419`: prove submit/withdraw replay does not double-consume or double-refund revision allowance.
- `08ea0f4af80a99b912fba6b29eb7dbcdd4424405`: protect accounting after operator work is locked.
- `c91b27d08f7ce3e9502459c27223ff7d3bec139e`: protect completion replay integrity and creation of the next draft.
- `b4f0af5b3773849f3662d62b3408fff970e74019`: cover revision-draft owner authorization.
- `c8efcac94270f286f7c2f1301448e91c874a5993`, `6f0e5b1dda16333299391933e1fdc3d842c60f4c`: protect completion-created drafts from stale save/submit commands.
- `3f1c590f18aab25ecba061e727410d8edaa9d61f`: protect withdrawn drafts from stale pre-withdraw saves/submissions.
- `5c32271ca45619bfe5776d3eae4aad286df2ef1e`, corrected by `f1a801300bc4dc95b6bd8d61df47994b0e880597`: prove replayed withdrawal retains exactly one receipt while stale fresh-key withdrawals cannot refund again or roll back newer intent.
- `28bcbdb4d44f9fcb6cef8a931b3472db5bb0a006`: prove a stale operator start after withdrawal/resubmission cannot lock or mutate the newer submission.
- Current change adds a focused completion-replay isolation regression: replaying an earlier successful completion after the customer has edited and submitted the completion-created draft must return the original receipt without rolling back newer content/status/accounting or creating another draft/receipt.

## Evidence grade
**S0 — Source.** Fresh exact-SHA automation is required before promotion. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must roll back state/accounting and must not create successful command receipts. Successful idempotent replays must return their original result without mutating newer lifecycle state. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
After the shared connected-browser gate is green, add browser coverage for a Review transition that currently exists only at the database-contract layer, or inspect another adjacent operator/customer race not already covered by the completion/withdrawal/start regressions.
