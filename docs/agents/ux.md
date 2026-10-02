# Builder 1 — UX handoff

## Ownership
Product UX, visual system, responsive behavior, accessibility, navigation, interaction states and polish.

## Current baseline
Latest known portal work includes complete interactive preview flows plus subsequent control, feedback and mobile polish. Read recent commits before choosing work.

## Handoff log

### 2026-10-02 — Build history retry form safety
- Continued the connected status/action reliability audit after the auth-session test gate was repaired.
- `BuildHistory` rendered its error-state `Try again` control without an explicit button type. HTML buttons default to submit, so embedding project history in a form context could submit unrelated customer data when the customer only intended to retry loading milestones.
- Added `type="button"` and focused static regression coverage in `tests/static-build.test.mjs`.
- Source/test commits: `07c643845eb834e0f097b118aa46514d1d369da8`, `c7cc76151235a5b2cdfb1114c19ffa104594976c` (the intermediate test commit was immediately corrected before handoff).
- Evidence: **S0 pending fresh CI**. Validation for the exact corrected source/test line was not complete when checked, so S1 is not inferred.
- Next: after CI clears, continue auditing connected retry/status actions for form safety, announcements, keyboard focus and narrow-layout defects. Builder 5 owns deployment provenance.
