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
