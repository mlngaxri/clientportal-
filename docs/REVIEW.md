# Systematic preview review

This pass covers the static client portal and the matching marketing embed. It preserves browser-local simulation; no real payment, account, deployment, email, CMS service or analytics service is introduced.

| Area | Reviewed and changed |
| --- | --- |
| Local state | Recover sensible defaults from malformed operations, onboarding and communication records; preserve revision lifecycle fields in draft recovery; restore the editing mode. |
| Initial Direction | Roll back failed sending/build-lock transitions; reset to the original brief instead of the last saved edits; prevent delayed file reads from changing a locked Direction. |
| Review | Block whitespace-only Directions; preserve rounds and submitted batches on failed submission, withdrawal and delivery completion; prevent advertising a fourth revision. |
| Uploads | Catch unreadable images; allow retries; reject stale targets after page changes; stop media tracks on failures, cancellation and page exit. |
| Operations | Keep Core, payment, connection and launch states unchanged when saving fails; validate the domain before a launch-domain check. |
| Accessibility | Keyboard access and Escape focus recovery for popovers; expanded state for contextual notes; preferences support the Save shortcut; focus fallback after dialogs; reduced-motion page transitions. |
| Build integrity | Remove duplicate stylesheet loading; retain identical standalone and embedded portal assets. |

Verification: Node model/build checks run locally. The marketing repository's GitHub validation runs a production build, the existing 26 browser checks, and the new isolated review regressions. Browser and Next build verification use CI because this local runtime cannot launch Chromium or finish the Next build.

## Integration review follow-up

Direct website edits now survive CMS history, navigation and reload. Restored and cross-tab snapshots paint their incoming content before capture. CMS saving writes one consistent page-and-fields snapshot and rolls it back on failure. Consent settings persist, sample integrations can disconnect/reconnect, and launch checks use current form/search readiness. Paid receipts and three-page analytics exports agree with the sample project. Onboarding reset preserves original references; stored briefs respect field limits; marketing responds to changes in the reduced-motion preference.

Fourteen isolated integration regressions extend the existing 44 browser checks to 58. Node tests and TypeScript/structure checks run locally; production build and browser checks run in GitHub validation.
