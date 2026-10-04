# Builder 3 — Review handoff

## Ownership
Initial Direction, media and annotation UX, Review, revision lifecycle, locking/withdrawal/history and associated accessibility/reliability.

## Current baseline
The connected application persists Review/revision state through Supabase-backed project commands, with database constraints and regression coverage for completeness, owner authorization, idempotency, locking, completion, stale-write conflicts, withdrawal and revision accounting. Annotation and revision-submit UI also has focused keyboard/semantic/form-safety coverage. External review/upload provider acceptance remains unproven and must not be inferred from local or CI behavior.

## Current evidence
- Latest main inspected before this change: `8546c81ec67ebc25535e4296a7fdb714c0b0d71f`; no exact-SHA combined status was attached when this task was selected.
- Replacement uploads are bound to the acknowledged `boardIdentity` that initiated them. After `uploadAsset(...)` resolves, completion refuses to add a Direction or clear current messaging if props have switched to another Review identity, even when the replacement Review is still editable.
- Upload failures are identity-scoped too: an obsolete upload rejection cannot surface its retry alert inside a newer Review.
- Upload busy state is identity-scoped: acknowledging a new Review resets the prior board's upload count, while obsolete upload completion cannot decrement the replacement Review's independent count. Focused source regression coverage landed in `9ea145fb680c99c568519c0b45900234960d07c9` after the production fix `78c4109a05a9b51d32bea482785a903d2ceda49e`.
- Upload completion still re-checks current lock state before adding a Direction, preserving the existing submitted/locked guard.
- Open revision submission dialogs are identity-bound and close when acknowledged Review identity changes; the editable submit trigger remains disabled while a lifecycle command is pending.
- Lifecycle commands synchronously gate duplicate submit/withdraw actions, retain successful replay protection until acknowledgement changes, and ignore stale success/failure completion after board identity changes. Focused command-lifecycle regressions were restored in `48b7fec333f1ba36e158c941b3d194becb9e0594`.
- Reattachment intent is identity-bound: `8f2b475c77bd28f24be657043464567f0c755a35` cancels active reattachment and clears its obsolete instruction when acknowledged Review identity changes, and `1a7e43472576467ad9348cf350dd21430e9899bf` adds focused source regression coverage for that transition.
- Reattachment is also keyboard-cancelable: `34d66aee1777fb0b031ed58eb9af3cbefaab2856` exposes an explicit button while reattachment is active and uses input-neutral instructions; `aa278b95a820fc8e25a6f82b2182fb7c58692487` adds focused source regression coverage.
- Preview-derived context is identity-bound: `deec810c051dd0c2cb1b30e1218321f6456f8d03` prevents a target captured from an obsolete Review canvas from enabling or creating a Direction on the replacement Review, with focused regression coverage landed subsequently.
- Selected-Direction editor intent is cleared whenever acknowledged Review ID/status/version changes by `1780701f71216b85bf7ff0c033cd4294649d0e06`; `7ccbedd5ae309f286a05447538fa5ac55f311c86` adds focused regression coverage for the identity reset. `50037fccf024f294661797df813f3fc69289a9cf` aligns the adjacent upload-state regression with that selection reset.
- Late callbacks retained by an obsolete `ReviewCanvas` are now identity-guarded before they can select a Direction, update preview context, persist annotation strokes, create/reattach a Direction, or begin replacement attachment work. `8eec140b85ffa29618419673a8b01ae3610eec8d` established the callback guards, `d8902d80f2c756be242205671b1758f92910ecb1` closed the remaining stale `onSelect` path, and `ca5404c82fcd50a7ea419f9256a4beabf524b03e`, `8dd4f9e0a2de72743edaf58cfb24cdd5261f1f63`, and `da984d1f91c6df522677aa09de7a288a23494ae3` provide focused source regressions around those canvas identity boundaries.
- Revision accounting remains server-authoritative; no client change in this run consumes or refunds an entitlement.
- No live or external-provider acceptance is claimed.

## Recent Review work
- `3cd256d9d8751eeaa75ef728ddd940e7ba16acde`, covered by `b4077213501817169ca6d36d19d58cfd7a13dc3e`: re-check Review lock state after asynchronous upload completion before adding a Direction.
- `91ee00279941b08bb101adc963ebadc249c2f982`: ignore successful lifecycle completion after acknowledged props switch to another board identity/status/version.
- `e91d7d7832f53a69914f7163f7f89dfeae3b55be`: suppress stale withdrawal failure alerts after acknowledged Review identity changes.
- `63fc0ae61c2cb754025f65e244255fc6bfb49446`, covered by `ab2557775fd20c235477160f5a6e8cfff1bca0d2` and aligned by `cb4dc0c19553f3d4ab65caa3f7738cac89f26cff`: bind the submission dialog to acknowledged Review identity and cover stale-dialog invalidation.
- `a8755955ce3da6f512ca69acf3f55d6324c925f0`: scope replacement upload success/failure completion to the initiating Review identity.
- `78c4109a05a9b51d32bea482785a903d2ceda49e`, covered by `9ea145fb680c99c568519c0b45900234960d07c9`: reset upload busy state on acknowledged Review identity changes without allowing obsolete upload completion to corrupt the new board's count.
- `8f2b475c77bd28f24be657043464567f0c755a35`, covered by `1a7e43472576467ad9348cf350dd21430e9899bf`: cancel stale reattachment intent and instruction when acknowledged Review identity changes.
- `deec810c051dd0c2cb1b30e1218321f6456f8d03`: scope preview-derived target context to acknowledged Review identity so obsolete canvas callbacks cannot reactivate stale targeting.
- `1780701f71216b85bf7ff0c033cd4294649d0e06`, covered by `7ccbedd5ae309f286a05447538fa5ac55f311c86`: clear selected-Direction editor intent on acknowledged Review identity changes and cover the reset.
- `48b7fec333f1ba36e158c941b3d194becb9e0594`: restore focused Review lifecycle command regressions after surrounding test evolution.
- `8eec140b85ffa29618419673a8b01ae3610eec8d`, followed by `d8902d80f2c756be242205671b1758f92910ecb1`: guard obsolete Review canvas callbacks, including selection, against acknowledged board transitions. Focused callback regressions landed in `ca5404c82fcd50a7ea419f9256a4beabf524b03e`, `8dd4f9e0a2de72743edaf58cfb24cdd5261f1f63`, and `da984d1f91c6df522677aa09de7a288a23494ae3`.
- `34d66aee1777fb0b031ed58eb9af3cbefaab2856`, covered by `aa278b95a820fc8e25a6f82b2182fb7c58692487`: make active reattachment explicitly keyboard-cancelable and remove pointer-only wording.

## Evidence grade
**S0 — Source.** Current source and focused source-regression coverage are present, but no exact-SHA automated result is available. No S2/S3/S4 claim is made.

## Boundary
Never double-consume or double-refund revision entitlements. Failed/stale commands must not mutate newer lifecycle state. Successful idempotent replays must return their original result without mutating newer state. Asynchronous Review work belongs to the acknowledged board identity that initiated it: lifecycle commands, replacement uploads, preview-derived context, selected-Direction editor intent, reattachment intent and canvas callbacks must not mutate a newer Review after identity changes. Failed attachment uploads must preserve existing Directions and leave the chooser retryable. Replacement uploads must retain the validated target captured at start and must not add a Direction after Review locks. Upload busy state must belong only to its initiating Review. Reattachment must remain cancellable without pointer input. Do not claim external review/upload acceptance without real provider evidence.

## Next recommended action
Keyboard cancellation for active reattachment is now implemented and source-covered. Audit media chooser focus recovery next: the current file input clears its value after selection and upload failures preserve retryability, but source does not explicitly restore focus to a meaningful attachment control after a canceled chooser or failed asynchronous upload. Verify browser behavior and add the smallest focus-management fix plus regression coverage if needed. If that boundary is already sound, inspect drawing-mode keyboard/touch entry and exit or one remaining Review media/error path for obsolete announcements across acknowledged board transitions.
