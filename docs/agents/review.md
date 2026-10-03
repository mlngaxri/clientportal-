# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest main inspected before this change: `bc5f6f3dbbb1a2aaeb88fec5bd807bb6bf570367`; no exact-SHA combined status was attached when this task was selected.
- Review attachment retry text promises that a failed upload can be retried by choosing the file again. The file input clears its native selection immediately after capturing the File, so selecting the same file after a failed upload fires a fresh change event without mutating existing Directions.
- Successful retry clears the stale upload error only after the asset is uploaded and the replacement Direction is added.
- Replacement uploads initiated by `ReviewCanvas` pass the validated bridge-event context into `Review.replacement`; focused source regression coverage locks that captured target through the asynchronous upload instead of allowing completion to consult mutable current Review context.
- Deleting the selected Direction restores keyboard focus to the visible Add Direction control on the next animation frame, announces the deletion through a polite status, and cancels reattachment if the deleted Direction was the active reattachment target.
- A selected Direction that disappears from acknowledged board data is cleared; editable Review restores focus to Add Direction, while locked Review truthfully announces only that the selection disappeared.
- Direction rows now expose their visual selected state programmatically with `aria-pressed`, with focused source regression coverage on current main.
- Reattachment is canceled when its target disappears or when Review becomes locked, preventing stale website clicks from remaining actionable.
- Upload completion re-checks current lock state before adding a Direction, with focused regression coverage.
- An open revision submission dialog closes and announces the reason if acknowledged board state becomes locked before submission completes, preventing stale submit UI from remaining actionable.
- Submit/withdraw commands release their busy lock on success and failure; a successful command retry clears any stale failure alert before parent refresh acknowledgement.
- Lifecycle commands acquire a synchronous ref gate before the first await, preventing same-tick duplicate submit/withdraw requests and same-action replay while success is awaiting acknowledged board identity/status/version change.
- Successful lifecycle completion compares the board identity captured at command start with the latest acknowledged identity before mutating Review message, completion gate, dialog/announcement state or triggering refresh.
- Withdrawal rejection also checks the originating acknowledged identity before surfacing its error, preventing an old withdrawal failure from poisoning a newer Review.
- Concrete remaining defect: the revision submission dialog owns its rejection alert locally. If `submit_revision` is pending and acknowledged props switch to another editable board identity, the current lock-only dialog cleanup does not close the old dialog. A later rejection can therefore render the old request error inside UI now representing the newer board. Exact repair target: `components/Review.tsx` should invalidate/close an open submit dialog whenever its originating `boardIdentity` changes, not only when `locked` becomes true; the editable Submit Revision trigger should remain unavailable while a lifecycle command is pending so a new dialog cannot be opened over the old request. Exact regression target: extend `tests/review-stale-command-completion.test.mjs` (or add a narrowly named sibling) to assert identity-scoped dialog invalidation and pending-command trigger gating.
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
- `17eb8ad438de7c3ed3688b339bfddea65af433d2`: lock replacement uploads to the validated target captured when the upload began.
- `eff7d97882da185b8faacd0400a91aac7d827b57`, covered by `a843f6f113df5debd8e50801055c37f18cdd506f`: restore keyboard focus to Add Direction after deleting the selected Direction.
- `42e9e632c20a6745e18e572f2dffa28a866dbf45`: announce Direction deletion through a polite live status, clear stale feedback when a new Direction begins, and extend the focused deletion regression to cover both behaviors.
- `4363fa45ef6bbb720f64905a107ef0b76a092eed`, repaired by `a3c09d6edb686e68b104365a55cc8f609308f654` and `7b17973272bbe40b5f89401b23be12be124df2ac`: recover stale Review selection after acknowledged data removes a Direction, with focus restoration only when the editable Add Direction control exists.
- `bcefca668b54eb1c714eeca3b3e23394b09ceaff`: cancel reattachment when a Direction is deleted locally.
- `babdea28fa2fa9afd6126c109e685649561097a8`: cancel and announce stale reattachment when acknowledged board data removes its target, with focused regression coverage.
- `683e8036eac4ef12a5672857e8ae83471fbe3e98`, covered by `18da75cccccca5734ff226478c9fe7d60b5b4417`: cancel active reattachment when Review becomes locked.
- `3cd256d9d8751eeaa75ef728ddd940e7ba16acde`, covered by `b4077213501817169ca6d36d19d58cfd7a13dc3e`: re-check Review lock state after asynchronous upload completion before adding a Direction.
- `905c699d842f85060b52f3a9b6373d2b3078c493`: cover command busy recovery and withdrawal failure alerts.
- `71fda8c8ba3862d7c62be60dfe070797b4885ab6`: clear stale Review command errors only after a retry succeeds.
- `ab733ba6a272f7a4f2770e6f35a65f0dec5dcf2a`: retain successful withdrawal replay protection until acknowledged Review state changes.
- `068e35c84b03fde72c58c27b866b7e57b6c41840`, covered by `751798d63d14f70292f7ab0b86399332bb7517f8`: synchronously gate duplicate Review lifecycle commands and lock the gate/reset invariant with focused source regression coverage.
- `91ee00279941b08bb101adc963ebadc249c2f982`, with assertions repaired/stabilized by `497adbcdbad4e4786ffe85816a2e6767d5e58238` and `e3a594572354585e176ccdedee2b70deeceb3127`: ignore successful lifecycle completion after acknowledged props switch to another board identity/status/version, before stale completion can mutate new Review UI/gate state or refresh it.
- `e91d7d7832f53a69914f7163f7f89dfeae3b55be`, regression-aligned by `6fe95c960988726ac4af5ff2d6c6168bd862a353`: suppress stale withdrawal failure alerts after acknowledged Review identity changes.
- `d9676b6dc1326f7a0b0cfe73e46058c2dd3ee65b`, covered by `c828e13445049474c193e52a71b993fccb1239e6` and matcher-constrained by `6cf8f2b62b52dff63b3f506d8ec0fa45f046877e`: keep Review direction button phrasing semantically valid with focused source coverage.
- `e121d9b0f4266a64aebe1b218a85b0cd0ed8d7c0`, covered by `895c7d134a71a233578d509da42fb629524c732c`: expose Review Direction selection to assistive technology with `aria-pressed` and lock the semantic state in focused coverage.

## Evidence grade
**S0 — Source.** This run inspected source and recorded a concrete stale-dialog invariant; no exact-SHA automated result is available for this documentation commit. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must roll back state/accounting and must not create successful command receipts. Successful idempotent replays must return their original result without mutating newer lifecycle state. Client lifecycle commands must synchronously reject same-tick duplicates and retain successful same-action replay protection until acknowledged board identity/status/version changes. A lifecycle completion started for an older acknowledged board must not mutate the new Review's success state, completed-command gate, dialog state or refresh lifecycle. A submission dialog belongs to the acknowledged board identity that opened it and must not survive a switch to a different identity while an old request is pending. Review workspace and canvas controls must not accidentally cross a surrounding native form boundary. Failed attachment uploads must preserve existing Directions and leave the chooser capable of retrying the same file. Replacement uploads must retain the validated target captured when the upload began even if selection or current preview context changes before completion, and must not add a Direction after Review locks. Reattachment intent must be canceled when its Direction is deleted locally, disappears from acknowledged server data, or Review becomes locked. Deleting the selected Direction must not strand keyboard focus in removed DOM and must expose the state change to assistive technology. A submission dialog must not remain actionable after acknowledged state locks the Review. Successful command retries must clear stale command failure alerts before refresh acknowledgement. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
Fix the confirmed stale submission-dialog identity defect in `components/Review.tsx`: bind an open dialog to the `boardIdentity` that opened it, close/invalidate it when acknowledged identity changes even if the next board is still editable, and prevent reopening while the prior lifecycle command remains pending. Add focused source regression coverage in `tests/review-stale-command-completion.test.mjs` or a narrowly scoped sibling before claiming S1.
