# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest main inspected before this change: `c125a1c4397e3045fbd261fcff95d04cf9c89180`; no exact-SHA combined status was attached when this task was selected.
- Review attachment retry text promises that a failed upload can be retried by choosing the file again. The file input clears its native selection immediately after capturing the File, so selecting the same file after a failed upload fires a fresh change event without mutating existing Directions.
- Successful retry clears the stale upload error only after the asset is uploaded and the replacement Direction is added.
- Replacement uploads initiated by `ReviewCanvas` pass the validated bridge-event context into `Review.replacement`; focused source regression coverage locks that captured target through the asynchronous upload instead of allowing completion to consult mutable current Review context.
- Deleting the selected Direction restores keyboard focus to the visible Add Direction control on the next animation frame, announces the deletion through a polite status, and now cancels reattachment if the deleted Direction was the active reattachment target. This prevents the next website click from being consumed by an orphaned reattachment intent.
- A selected Direction that disappears from acknowledged board data is cleared; editable Review restores focus to Add Direction, while locked Review truthfully announces only that the selection disappeared.
- No live or external-provider acceptance is claimed.

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
- `c0d9e96a2f57ec36980a767fa6f54161a814a677`: prove replaying an earlier successful completion after a newer revision is submitted returns the original receipt without rolling back newer content/status/accounting or creating another draft/receipt.
- `cf102386363606fd40b78632c111f39a1b5a893a`: make every native button owned by `components/Review.tsx` explicitly `type="button"` with focused source regression coverage.
- `b1d0cda095d6d46023f3deb48b9a3eb8e0aaf2dd`, covered and repaired by `aeb2837ae202d5318cd0e44ed00c5e97758f10b9` and `4952efdf25d78f5e90ac924a73c6ce4166c46fbc`: keep ReviewCanvas viewport/review-mode controls explicitly non-submitting with regression coverage matched to the component's two button templates.
- `d0e27c7a733072834cdcc8a86ee3f6bbac9e1647`, repaired by `9b7959234c39db7a278668111c012bafe1b47cc7` and `3a6128b28c329c4fc2434b0ce9eeb92982b6d1c4`: allow same-file Review upload retries and keep the regression matcher aligned with the source.
- `6be23906f589547d241172b3bb77a13d42cf1715`: clear stale Review upload errors after a successful retry and cover the success/failure messaging boundary.
- `17eb8ad438de7c3ed3688b339bfddea65af433d2`: lock replacement uploads to the validated target captured when upload begins.
- `eff7d97882da185b8faacd0400a91aac7d827b57`, covered by `a843f6f113df5debd8e50801055c37f18cdd506f`: restore keyboard focus to Add Direction after deleting the selected Direction.
- `42e9e632c20a6745e18e572f2dffa28a866dbf45`: announce Direction deletion through a polite live status, clear stale feedback when a new Direction begins, and extend the focused deletion regression to cover both behaviors.
- `4363fa45ef6bbb720f64905a107ef0b76a092eed`, repaired by `a3c09d6edb686e68b104365a55cc8f609308f654` and `7b17973272bbe40b5f89401b23be12be124df2ac`: recover stale Review selection after acknowledged data removes a Direction, with focus restoration only when the editable Add Direction control exists.

## Evidence grade
**S0 — Source.** Fresh exact-SHA automation for the current change is not yet proven. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must roll back state/accounting and must not create successful command receipts. Successful idempotent replays must return their original result without mutating newer lifecycle state. Review workspace and canvas controls must not accidentally cross a surrounding native form boundary. Failed attachment uploads must preserve existing Directions and leave the chooser capable of retrying the same file. Replacement uploads must retain the validated target captured when the upload began even if selection or current preview context changes before completion. Deleting the selected Direction must cancel any reattachment intent for that Direction, must not strand keyboard focus in removed DOM, and must expose the state change to assistive technology. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
Inspect reattachment recovery when acknowledged server data removes the reattachment target without a local Delete action; either clear orphaned reattachment intent when its target disappears or add focused regression evidence proving the next website click cannot be silently consumed.
