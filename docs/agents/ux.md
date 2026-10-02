# Builder 1 — UX handoff

## Ownership
Product UX, visual system, responsive behavior, accessibility, navigation, interaction states and polish.

## Current baseline
Latest known portal work includes complete interactive preview flows plus subsequent control, feedback and mobile polish. Read recent commits before choosing work.

## Handoff log

### 2026-10-01 — Draft recovery accessibility audit
- Reviewed the recovery flow in `public/portal-reliability.js`.
- Identified a concrete keyboard/screen-reader improvement: expose the recovery choices as an announced region and move initial startup recovery focus to the primary choice without stealing focus for cross-tab updates.
- Implementation writes to the runtime JavaScript were blocked by the connected GitHub write safety layer during this run, so no product behavior was changed and no S0/S1 claim is made.
- Commit `774d85542167782b69fbf627bc4b2e1961e7623f` only recorded an interim handoff marker and is not a product change.
- Next: retry the bounded recovery accessibility patch, add a static regression assertion, then let Builder 5 grade deployment evidence.

### 2026-10-02 — Route-error keyboard recovery regression coverage
- Added a focused source regression to `tests/static-build.test.mjs` for the connected route-error boundary introduced by `4fb682e878113d76ac8e146604c1d291dbc5aa32`.
- The regression requires a programmatically focusable error heading, focus-on-mount, and the visible retry action so future refactors cannot silently remove the keyboard/screen-reader recovery context.
- Source/test commit: `e2b1102ab03d5daad5d1c62fc01e4665a2ff9be4`.
- Evidence: **S0 pending CI**. No workflow run existed for the exact commit when checked, so S1 is not claimed.
- Blocker: the repository already had a separate TypeScript failure in the persisted-State database regression before this UX-only change; Builder 4/5 owns that operational/release blocker.
- Next: use the new UX audit as the prioritized backlog and take the highest-value connected-app UX item that remains after red build issues are cleared; do not spend a UX run on deployment plumbing.

### 2026-10-02 — Repair route-error accessibility regression test
- Current `main` validation reached `npm test` after typecheck passed, then failed only the route-error accessibility regression because its retry-button regex assumed `Try again` immediately followed the opening tag; the component intentionally formats the label on its own line.
- Updated the assertion to tolerate JSX whitespace while still requiring `Try again` to be the button label. No production UX behavior changed.
- Source/test commit: `5cfd967d4f09a78ca66f48f6788e469fd5425c85`.
- Evidence: **S0 pending fresh CI**. The preceding `b1f379876302b31a4875d73779e110cc11bcdaab` workflow proved typecheck passes and isolated this test as the `npm test` blocker, but S1 is not claimed until validation runs against the repair commit.
- Blockers: none for this source repair. Build, connected browser, deployment and live evidence remain downstream of CI and Builder 5.
- Next: after CI clears, return to the highest-value connected-app accessibility/responsive defect from the UX audit rather than changing the already-correct route-error component.

### 2026-10-02 — Connected draft recovery keyboard focus
- Brought the connected `RecoveryNotice` flow up to the recovery accessibility behavior already protected in the standalone preview: when an unfinished local draft becomes available, keyboard focus moves to the primary `Restore draft` action so the recovery decision is immediately reachable without hunting through the page.
- Replaced the section's generic label with `aria-labelledby` pointing at its visible recovery explanation, preserving one source of truth for assistive context.
- Added static regression coverage for the focus ref/effect, labelled recovery region and primary action wiring.
- Source commits: `a393129231519cdd0cf5d7d04aa7275b736517c3`, `ff295fed49ad6fb2c7a5f49ea29f4c072286012a`.
- Evidence: **S0 pending CI**. Validation for the new source/test line was not complete at handoff, so S1 is not claimed.
- Blockers: none in source. Builder 5 owns downstream connected-browser and deployment evidence.
- Next: inspect another connected-app recovery/error/status surface from the UX audit for keyboard focus or screen-reader announcement gaps; avoid revisiting this flow unless CI exposes a regression.

### 2026-10-02 — Password mismatch field identification
- Improved the connected password-update form so a client-side mismatch marks both password fields invalid and associates them with the existing alert text. This gives assistive technology field-level context instead of announcing only a detached page alert.
- Added a focused static regression covering the mismatch predicate, both `aria-invalid`/`aria-describedby` relationships and the stable alert id.
- Source/test commit: `54ee46ec5f603054f0fb494d6ac19366152e9ea3`.
- Evidence: **S0 pending CI**. The source and regression are committed; fresh validation for this SHA was not complete at handoff.
- Blocker: the pre-existing connected-browser billing locator remains the repository-wide red gate; this UX task does not weaken or bypass it.
- Next: after CI, inspect another connected form/recovery surface for error association or status-announcement gaps; Builder 5 owns deployment provenance.

### 2026-10-02 — Responsive billing acceptance contract
- Inspected validation run 117's connected-system artifact and failure screenshot for exact `main` SHA `2c55467743a8c5cb272f15607c0a737628f3b0bd`. The phone billing UI intentionally renders payment information as responsive cards, where the visible state is `Initial payment confirmed`; the browser harness incorrectly required a table-cell role for `Website start`.
- Updated only the billing assertion in `tests/browser/connected-system.mjs` to wait for the exact customer-facing `Initial payment confirmed` text, preserving the rest of the phone overflow, navigation, billing lifecycle and connected-system coverage.
- Source/test commit: `7fb8dcbd16de05bb4695064a0b9023e2dd26d39b`.
- Evidence: **S0 pending fresh CI**. The preceding run proves the old locator was the active browser blocker, but S1/S2 are not claimed until validation executes against the repair commit.
- Blockers: none known in this bounded acceptance contract. Builder 5 owns release provenance and any downstream failure exposed after this locator clears.
- Next: after CI, return to a connected-app accessibility/responsive defect rather than revisiting billing unless fresh evidence identifies a product issue.

### 2026-10-02 — Payment status action form safety
- Current validation for preceding `main` SHA `b94c6658569fb22403cadadff23f3355832d5934` completed successfully, so this run moved down the ladder to connected-app UX reliability.
- `PaymentReturn` rendered its `Check confirmation` action without an explicit button type. HTML buttons default to submit inside a form, so reusing this status component within form context could accidentally submit unrelated customer data while checking payment state.
- Added `type="button"` and a focused static regression requiring the non-submit contract.
- Source/test commit: `7c90980699ab39d54e58c3566e3c7f441f756d13`.
- Evidence: **S0 pending fresh CI**. No check result existed for the exact source/test SHA when checked, so S1 is not claimed.
- Blockers: none in source. Builder 5 owns deployment provenance; the release workflow is separately failing closed while Vercel credentials are absent.
- Next: inspect another connected status/recovery action for form-safety, focus, announcement or narrow-layout defects after CI clears.

### 2026-10-02 — Recovery action form safety
- Validation run 140 was green for the preceding `main` SHA `c6837992c1379b0dec989d9c623aea48430c02c9`, so this run continued the connected recovery/action reliability audit rather than deployment work.
- `RecoveryNotice` had eight action buttons without explicit button types. Because HTML buttons default to submit, embedding this reusable recovery/conflict surface in an editor form could submit unrelated draft data when the customer only intended to undo, restore, export, discard, or resolve a conflict.
- Added `type="button"` to every recovery/conflict action and a static regression requiring every button in `RecoveryNotice` to remain non-submit. The existing primary-focus regression was updated to match the safe button contract.
- Source/test commit: `c12533b2fe6db8e8825de77ea1380b95754b0eb4`.
- Evidence: **S0 pending fresh CI**. Run 140 proves the parent line was green, not this exact source SHA; S1 is not inferred.
- Blocker: none in this UX source change. Builder 5 owns the separate fail-closed Vercel credential/deployment gate.
- Next: after CI, inspect another connected editor/status action surface for form-safety, status-announcement or narrow-layout defects.
