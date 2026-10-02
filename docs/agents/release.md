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

### 2026-10-02 — Release gate: deployment credentials fail closed
- Commit `b94c6658569fb22403cadadff23f3355832d5934` hardened `.github/workflows/deploy.yml` so a missing `VERCEL_TOKEN` fails the deployment job instead of returning a misleading green workflow with checkout/build/deploy skipped.
- The latest deployment attempt for current main `5ae090ad9b766766c9df0f7d2931d2937fbd6504` now fails at `Check configured deployment credentials and current commit`; checkout, production-config validation, build and deploy are all skipped. This is expected fail-closed behavior and proves that repository deployment credentials are not currently configured for the workflow.
- Evidence grade: **S0 for deployment readiness; S3/S4 are not claimed.** A successful validation run does not establish deployment, and no canonical Vercel alias has been tied to the current main SHA.
- Release blocker: configure the repository `VERCEL_TOKEN` secret through the repository/provider administration boundary, then allow a green `Validate Fourthform system` push run on current main to trigger deployment. The deployment workflow must execute checkout, production configuration validation, production build and exact prebuilt deployment before it can count as deployment evidence.
- Next release priority: after credentials are configured, inspect the next deployment run and verify the actual deployed SHA on the canonical client portal alias before assigning S3. Until then, keep the release gate failed closed rather than retrying source changes for a provider credential that is intentionally unavailable to repository code.

### 2026-10-02 — Release gate: transient cookie regression typecheck
- Validation run 146 for `d6d3768d5b8dcfdde3a6a0d5c79ea0864eedbd7d` failed at `npm run typecheck`; tests, isolated Supabase, build and connected browser validation were skipped.
- The transient-cookie regression constructed provider options with an object literal followed by `...transient`, while `transient` always contains `maxAge`; TypeScript reports the statically duplicated property before tests can run. The test now uses `Object.assign({}, providerOptions, transient)`, preserving the runtime override contract without the duplicate-property diagnostic.
- Final repair commit `8541b3e412621832743293fed620d67e804abf75` also preserves the pre-existing auth-cookie matching regression coverage unchanged.
- Evidence grade: **S0 pending fresh exact-SHA validation.** Run 146 is failure evidence for its parent only and cannot promote the repair.
- Deployment remains fail-closed: no canonical Vercel alias is tied to this SHA, and S3/S4 are not claimed.
- Next release priority: inspect exact-SHA validation for `8541b3e4...`; only after it is green should deployment evidence be considered, and only with actual deployed-SHA identity.
