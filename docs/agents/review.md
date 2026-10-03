# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest main inspected before this change: `b62ccc38cf4cee0c22cbc21d6269a627b581da98`; no exact-SHA combined status was attached when this task was selected.
- Replacement uploads are now bound to the acknowledged `boardIdentity` that initiated them. After `uploadAsset(...)` resolves, completion refuses to add a Direction or clear current messaging if props have switched to another Review identity, even when the replacement Review is still editable.
- Upload failures are identity-scoped too: an obsolete upload rejection cannot surface its retry alert inside a newer Review.
- Upload completion still re-checks current lock state before adding a Direction, preserving the existing submitted/locked guard.
- Open revision submission dialogs are identity-bound and close when acknowledged Review identity changes; the editable submit trigger remains disabled while a lifecycle command is pending.
- Lifecycle commands synchronously gate duplicate submit/withdraw actions, retain successful replay protection until acknowledgement changes, and ignore stale success/failure completion after board identity changes.
- Revision accounting remains server-authoritative; no client change in this run consumes or refunds an entitlement.
- No live or external-provider acceptance is claimed.

## Recent Review work
- `3cd256d9d8751eeaa75ef728ddd940e7ba16acde`, covered by `b4077213501817169ca6d36d19d58cfd7a13dc3e`: re-check Review lock state after asynchronous upload completion before adding a Direction.
- `91ee00279941b08bb101adc963ebadc249c2f982`: ignore successful lifecycle completion after acknowledged props switch to another board identity/status/version.
- `e91d7d7832f53a69914f7163f7f89dfeae3b55be`: suppress stale withdrawal failure alerts after acknowledged Review identity changes.
- `63fc0ae61c2cb754025f65e244255fc6bfb49446`, covered by `ab2557775fd20c235477160f5a6e8cfff1bca0d2` and aligned by `cb4dc0c19553f3d4ab65caa3f7738cac89f26cff`: bind the submission dialog to acknowledged Review identity and cover stale-dialog invalidation.

## Evidence grade
**S0 — Source.** This run changes source and focused source-regression coverage, but no exact-SHA automated result is available yet. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must not mutate newer lifecycle state. Successful idempotent replays must return their original result without mutating newer state. Asynchronous Review work belongs to the acknowledged board identity that initiated it: lifecycle commands and replacement uploads must not mutate a newer Review after identity changes. Failed attachment uploads must preserve existing Directions and leave the chooser retryable. Replacement uploads must retain the validated target captured at start and must not add a Direction after Review locks. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
Audit the remaining asynchronous Review continuations for the same identity boundary, especially save/recovery and reattachment interactions during editable-to-editable board transitions. Prefer one concrete defect or a focused regression proving the invariant rather than broad refactoring.
