# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest main inspected before this change: `d133be80c33de6814a0b629da90ee5f6b1c649d0`; no exact-SHA combined status was attached when this task was selected.
- Replacement uploads are bound to the acknowledged `boardIdentity` that initiated them. After `uploadAsset(...)` resolves, completion refuses to add a Direction or clear current messaging if props have switched to another Review identity, even when the replacement Review is still editable.
- Upload failures are identity-scoped too: an obsolete upload rejection cannot surface its retry alert inside a newer Review.
- Upload busy state is identity-scoped: acknowledging a new Review resets the prior board's upload count, while obsolete upload completion cannot decrement the replacement Review's independent count. Focused source regression coverage landed in `9ea145fb680c99c568519c0b45900234960d07c9` after the production fix `78c4109a05a9b51d32bea482785a903d2ceda49e`.
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
- `a8755955ce3da6f512ca69acf3f55d6324c925f0`: scope replacement upload success/failure completion to the initiating Review identity.
- `78c4109a05a9b51d32bea482785a903d2ceda49e`, covered by `9ea145fb680c99c568519c0b45900234960d07c9`: reset upload busy state on acknowledged Review identity changes without allowing obsolete upload completion to corrupt the new board's count.

## Evidence grade
**S0 — Source.** Current source and focused source-regression coverage are present, but no exact-SHA automated result is available. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must not mutate newer lifecycle state. Successful idempotent replays must return their original result without mutating newer state. Asynchronous Review work belongs to the acknowledged board identity that initiated it: lifecycle commands and replacement uploads must not mutate a newer Review after identity changes. Failed attachment uploads must preserve existing Directions and leave the chooser retryable. Replacement uploads must retain the validated target captured at start and must not add a Direction after Review locks. Upload busy state must belong only to its initiating Review. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
Audit reattachment state across editable-to-editable Review identity transitions. `components/Review.tsx` currently cancels reattachment when its Direction disappears or the board locks, but does not explicitly bind `reattach` intent to `boardIdentity`; verify that an acknowledged board switch cannot carry a stale reattachment instruction/intent into the replacement Review, then add the smallest focused regression or fix if needed.
