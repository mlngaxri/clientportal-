# Local preview acceptance — 30 September 2026

The current milestone is a polished visual MVP with interactive simulations. Production integrations remain a later milestone.

| Area | Local behavior | Evidence / boundary |
| --- | --- | --- |
| Marketing | Editorial typography, animated website object, work/process/States/pricing, embedded portal and onboarding routes | Five viewport checks; animated screenshot tour; local image check |
| Onboarding | Account illustration, compact business brief, save/reload recovery, example payment and Initial Direction handoff | Browser journey; password excluded from storage; no account or charge |
| Initial Direction | Editable text, attachments, links, drawings, media annotation, deliberate Send, build lock/unlock | Text/save/reload, vector strokes, Send allowance and lock checks; actual capture needs browser permission |
| Review | Page navigation, contextual Directions, image proposal, drawing, draft editing | Replacement preserves website; CMS edits update reviewed page |
| Revisions | Required acknowledgement, cancellable keyboard/pointer hold, submitted lock, reload, withdrawal and history | Browser submit/reload/withdraw; SQL replay and entitlement tests |
| CMS | Per-page content, preview image input and sample website updates | Browser saved heading check; no external CMS publish |
| Search | Editable search appearance and derived inspection feedback | Browser empty-title inspection; no crawler or ranking API |
| Analytics | Period-dependent sample metrics and chart; matching export | Browser range/chart check; no real traffic collection |
| Domains / Connections | Editable setup and sample verification/test flows | Phone layout tour; no DNS/service mutation |
| States | Schedule, weekday/time and alternate heading editing; sample state preview | Phone layout tour; no server scheduler |
| Billing | Explore Pro, activate example and cancel to Core, sample billing details and receipt | Browser upgrade/cancel; no financial transaction |
| Launch | Local checklist gates and launch illustration | Phone layout tour; no customer deployment |
| Responsiveness | Marketing, onboarding and portal at 320, 390, 768, 1280 and 1440 px | Screenshot evidence and overflow assertions |
| Accessibility | Named buttons, keyboard dismiss/focus restoration, modal focus containment, acknowledgement, reduced motion | Automated named-button and keyboard checks; no full accessibility certification |
| Reliability | Verified device save, recovery/export/reset, navigation guards | Local preview source; server integrity tests separately validate production scaffolding |
| Build / dependencies | Next.js build; local automated tests; production dependency audit | Build artifact and current logs; audit found zero reported production vulnerabilities |

No live Supabase, Google OAuth, Stripe, malware scanner, analytics provider, CMS adapter or DNS acceptance was performed. This repository is prepared for GitHub delivery. No Vercel deployment or project linking was performed. Production backend source remains in the original project bundle and is outside this preview repository.

Final browser result: **17 of 17 journey checks passed**, with no uncaught JavaScript errors. The separate animated/mobile tour also passed. These are local browser results, not production service acceptance.

Repository separation checks: isolated marketing TypeScript/build and standalone portal build pass. Operational draft recovery and reset are included in the 17-check browser suite.
