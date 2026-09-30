# Preview consistency pass — 1 October 2026

Fixed page-scoped CMS images and unsaved draft isolation. CMS now starts with the actual sample website content, validates heading/action labels, includes editable image descriptions and rejects unreadable images. Failed saves retain drafts and restore the prior page record. Reservation labels reset when changing pages. Saved Home content supplies the States and Launch illustrations; unrelated edits do not overwrite the State heading. States use their own names and preserve valid overnight schedules.

Analytics source/page breakdowns now sum exactly to each selected period’s visible totals. CSV exports use the same report data, include totals and page breakdowns, and name the selected period.

Six local portal/model/build tests passed. Marketing has six native FAQ disclosures, one focusable skip target, two passing server-rendered structure checks and a passing TypeScript check. The standalone and embedded portal files match.

Current workspace cannot launch Chromium or finish Next.js compilation because its process filesystem support is unavailable. New browser regression cases are added but not claimed as locally passed. Repository CI validates builds and browser journeys after pushes; refer to the current Actions run for that result. Earlier 24-check browser evidence remains historical.
