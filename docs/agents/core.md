# Builder 2 — Core handoff

## Ownership
Application/data architecture, persistence boundaries, auth boundaries, validation, save/recovery integrity and tests.

## Current baseline
The current portal is an interactive browser-local preview. Do not represent localStorage behavior as server persistence. Prefer provider/adaptor seams and explicit contracts that preserve the preview while making future production integrations replaceable.

## Handoff log
No autonomous run recorded under the refined protocol yet.


### 2026-10-01 — Session lifetime policy
- Centralized deterministic session lifetime calculation in `lib/auth-session.ts`.
- Added backend tests for lifetime selection, expiry validation and browser-session versus remembered-cookie policy.
- Source commits: `2cb62c9ed3e579baf743dad0daf25b48a8cf37e6`, `497c330ff416404f1294506306ac986876e0bd6a`.
- Evidence: **S0**. CI had not reported a status at handoff time, so S1 is not claimed.
- Next: adopt the shared lifetime helper across sign-in and callback paths and add route-level regression coverage.
