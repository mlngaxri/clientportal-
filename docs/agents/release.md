# Builder 5 — Release handoff

## Ownership
Release integration, Vercel, security, regression QA, accessibility, performance, production configuration and evidence grading.

## Current baseline
Local acceptance documents distinguish preview behavior from production integration. Builder 5 is the sole release gate and should verify which commit is actually deployed before assigning live acceptance.

## Handoff log
No autonomous run recorded under the refined protocol yet.


### 2026-10-01 — Release gate: connected search-inspection regression
- Release validation for main commit `a27f710638f2645ba7b6b42d312dc5f710f84842` completed typecheck, the full automated test suite, isolated Supabase startup, production build, Chromium installation and application startup successfully.
- The connected browser journey then failed at `GET /api/projects/:id/inspect?page=home` with HTTP 400 after publishing had already been verified. GitHub Actions run: https://github.com/mlngaxri/clientportal-/actions/runs/36863092940.
- Evidence grade: **S1 for the source/unit/integration/build checks that passed; release gate FAIL for connected browser acceptance. S2/S3/S4 are not claimed.**
- Diagnosis: the failure is isolated to the development-only HTTP inspection transport used by the connected acceptance environment. The acceptance environment uses `APP_URL=http://localhost:4173`; the server-side inspection route self-fetches that URL. A bounded fix is to pin the disposable acceptance origin to IPv4 loopback (or equivalently pin only the trusted development self-fetch transport) while preserving the canonical URL used by SEO assertions.
- The connected GitHub write safety layer blocked both attempted source patches to the loopback transport during this run, so no source fix is falsely claimed.
- Live verification: fresh retrieval of both canonical Vercel aliases was unavailable from the release runner, and no deployed SHA was identifiable. No S3 claim.
- Next release priority: apply the loopback transport fix, rerun the full connected workflow, and only promote the current main line after the browser journey passes. Then identify the deployed Vercel SHA before live acceptance.

### 2026-10-02 — Release gate: CMS browser locator regression
- Latest-main validation run 78 for `760537ad74fb2920da90fdb21398a2cd833affe9` passed install, typecheck, the full automated suite, isolated Supabase startup, production build, Chromium installation and application startup, then failed in the connected browser journey while locating the CMS `Main heading` control.
- The evidence screenshot showed the control present and usable. Its wrapping label also contains the live character-count helper, so Playwright's exact accessible-name match was stricter than the product contract. The acceptance journey used the same exact locator again for cross-session persistence, making the test brittle to legitimate helper text.
- Commit `51574801a5cbc321c81a0d641110b09cf42d1e4d` removes `exact: true` from those two CMS field locators while retaining label-based selection and all save/persistence assertions.
- Evidence: **S0 pending fresh CI** for the repair. The preceding failed run establishes S1 for typecheck/unit/integration/build portions of `760537ad...`, but the release gate remains failed until the connected browser journey passes on the repair line.
- Deployment workflows for the failed main SHA were skipped, correctly preventing a failed validation from deploying. No deployed SHA was identified and S3/S4 are not claimed.
- Next release priority: inspect the fresh validation for `51574801...`; if green, verify the deployment workflow actually executes and identify the deployed commit on the canonical client-portal URL before assigning S3.
