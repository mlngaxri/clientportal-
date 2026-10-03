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

### 2026-10-03 — Launch action form safety
- Continued the connected action audit at the Launch workspace while the repository-wide validation gate is independently red at isolated Supabase startup.
- `LaunchWorkspace` had five action controls without explicit button types: save launch settings, run checks, open launch review, back, and launch. HTML defaults these to submit buttons, so composition inside a form could trigger an unrelated submission in addition to the intended launch action.
- Added `type="button"` to every Launch workspace action and a static invariant in `tests/static-build.test.mjs` requiring every button in the component to remain non-submitting.
- Evidence: **S0 pending fresh CI**. The current parent validation failure is at isolated Supabase startup after typecheck/tests, and does not provide exact-SHA evidence for this change.
- Next: inspect fresh validation for this commit, then continue the connected action audit for form safety, announcements, focus and narrow-layout behavior. Builder 5 owns release provenance.

### 2026-10-03 — Domain action submit intent
- Continued the explicit connected-action audit after exact-main validation returned green.
- `DomainsWorkspace` mixed one intentional form submit (`Add domain`) with retry, clipboard and connection actions whose button type was implicit. Made the form submit explicitly `type="submit"` and every non-submit domain action explicitly `type="button"`, so future form composition cannot silently change action semantics.
- Added a static regression requiring every domain button to declare its type and exactly one domain control to be a submit button.
- Evidence: **S0 pending fresh CI**. Parent `ad1c68184a5acf77232b3aac90540983e2e254aa` validation run 169 is green, but exact-SHA validation for this change is still required before S1.
- Next: continue the connected action audit for status announcements, keyboard focus and narrow-layout behavior. Builder 5 owns deployment provenance.

### 2026-10-03 — Keyboard-scrollable domain DNS records
- Followed the UX handoff into narrow-layout/accessibility reliability while the current release validation is independently exercising the auth recovery fix.
- `DomainsWorkspace` rendered hosting DNS records as a four-column table with no overflow boundary. Long DNS values can force the connected workspace wider than a narrow viewport, and keyboard-only users had no focusable horizontal-scroll region.
- Wrapped the DNS table in a named, focusable region with horizontal overflow so narrow layouts preserve the table without clipping the page and keyboard users can reach and scroll the records. Added focused static regression coverage.
- Evidence: **S0 pending fresh CI**. Parent `0ddbb9c50a83614828433afdfc701918ac28ea89` validation run 174 was still in progress when this task was selected; exact-SHA validation is required before S1.
- Next: continue auditing connected status/action surfaces for announcement, focus and narrow-layout defects. Builder 5 owns deployment provenance.

### 2026-10-03 — Domain operation progress announcements
- Continued the connected domain accessibility audit while the repository-wide validation run for the current parent was still in progress.
- Domain connect and DNS-record actions disabled their controls while awaiting the server but left the previous status message visible, so screen-reader users received no truthful indication that a new operation had started.
- `DomainsWorkspace.action` now immediately updates the existing live status with host-specific progress copy before awaiting the API. Added focused static regression coverage for both progress messages and the status live region.
- Evidence: **S0 pending fresh CI**. Parent `406b210767d0a4b8cac6df7bbfa6dd27b867c59e` validation run 179 was still in progress when selected; exact-SHA validation is required before S1.
- Next: continue auditing connected status/action surfaces for focus and narrow-layout defects. Builder 5 owns deployment provenance.

### 2026-10-03 — Inbox status progress announcements
- Current `main` validation passes install, typecheck, unit tests, isolated Supabase startup, build and application startup, but remains red in the connected-browser workflow; this bounded UX change does not claim to resolve that auth/recovery-class failure.
- Inbox row actions disabled while awaiting persistence but left the previous status announcement visible. Screen-reader users therefore had no truthful feedback that mark-read/unread/archive work had begun.
- `InboxWorkspace.status` now announces the requested operation before awaiting the API, replaces it with completion copy on success, and clears the progress message when the request fails so the alert is not contradicted by stale success-oriented status text.
- Added focused source regression coverage in `tests/inbox-accessibility.test.mjs`.
- Evidence: **S0 pending exact-SHA validation**. Parent validation is red at the connected-browser customer workflow, so S1 is not inferred.
- Next: continue the connected action audit for focus, announcement and narrow-layout defects after higher-priority red workflow work is resolved. Builder 5 owns deployment provenance.

### 2026-10-03 — Recovery PKCE host isolation
- Current `main` validation passes install, typecheck, unit tests, isolated Supabase startup, production build and app startup, then fails the real password-recovery browser check with `pkce_code_verifier_not_found`.
- The disposable app and Supabase Auth API both used the `127.0.0.1` cookie host on different ports. Cookies are host-scoped rather than port-scoped, so the acceptance environment did not preserve the production-like separation between portal PKCE cookies and the Supabase Auth service.
- Moved the disposable app/auth callback origin to `http://localhost:4173` while leaving Supabase services on their CLI `127.0.0.1` endpoints, and replaced the old same-host regression with a host-isolation invariant.
- Evidence: **S0 pending exact-SHA validation**. The parent browser failure is the evidence motivating this repair; a fresh workflow must prove the recovery journey before S1.
- Next: inspect exact-SHA validation. If recovery clears, resume the connected focus/announcement/narrow-layout audit. Builder 5 owns deployment provenance.

### 2026-10-03 — Clear stale Review upload errors after retry
- Latest `main` validation is green, so resumed the Review reliability audit after the recent same-file upload retry work.
- `Review.replacement` preserved its prior upload failure in the shared alert even after a retry uploaded successfully, leaving customers and assistive technology with a false error state beside the newly added Direction.
- Clear the shared message only after `uploadAsset` succeeds and the replacement Direction is added. Failure behavior and same-file retry behavior remain unchanged.
- Added focused regression coverage in `tests/review-upload-retry.test.mjs` requiring success to clear stale retry errors while failures still publish the retry alert.
- Evidence: **S0 pending exact-SHA validation**. Parent `43eb11add12cb6e4948f919e2bf1535da26b979a` validation run 228 is green; exact-SHA validation is still required before S1.
- Next: after exact-SHA validation, continue auditing connected Review focus, announcements and narrow-layout behavior. Builder 5 owns deployment provenance.
