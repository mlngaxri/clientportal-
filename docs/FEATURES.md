# Fourthform feature inventory

Fourthform combines a marketing website, a guided brief and an interactive client workspace. The portal remains a realistic browser-local MVP. Service integrations and external mutations are simulated.

## Marketing and portfolio

- An editorial homepage explaining the audience, custom website service, visitor goals and next action.
- A three-design hero selector using Monolith Hero, OYLA and Keel from the user's MotionSites portfolio.
- Four featured designs in a staggered image grid, linked to the complete `/work` collection.
- Twenty selected designs, curated after visually reviewing 49 public previews. Original project names and MotionSites source links are retained.
- Immersive, Editorial, Product and Expressive filters with result counts and selected states.
- Large native dialog previews with project descriptions, three design techniques per project, source links, previous/next controls, arrow-key browsing, Escape dismissal and restored keyboard focus.
- Direct project links such as `/work?project=oyla`.
- Four local, silent motion clips, requested explicitly rather than downloaded automatically: Monolith Hero, Keel, Nature Ritual and Playful Idea.
- Optimized local WebP images and smaller responsive variants.
- A chosen design becomes a brief reference without replacing existing business details or links.
- A four-stage process explanation: Direction, Build, Review and Launch.
- A working embedded portal preview with guided Review, Pages and Analytics tasks. Switching tasks preserves the local draft.
- A full-screen preview route preserving the selected task.
- A scheduled States story using the same Mori House headline and Evening service alternate as the portal.
- Site, First, Core and Pro pricing; direct package actions; scope, deposit, balance and revision terms.
- Native FAQ disclosures, desktop/mobile navigation, skip links and visible keyboard focus.
- Local fonts, large mixed typography, cinematic imagery, contrasting sections, subtle image perspective, GSAP transitions and reduced-motion layouts.
- Search metadata, canonical links, social preview images, robots and a sitemap including the portfolio.
- No em dashes, fabricated customer results, invented testimonials or award claims.

## Guided brief and onboarding

- Example Google and email entry flows, sign-in/sign-up presentation and password visibility. Account creation is simulated; passwords are never saved.
- Business name, description, visitor goals, visual feeling, online links, references and an optional note.
- Field limits, meaningful validation, selection counts and keyboard focus on errors.
- Browser-local save, resume, exit and unsaved-change protection, including storage failure handling.
- Site and First package context through the brief and example checkout.
- A saved brief preview, transparent example checkout and a direct handoff into Initial Direction.
- Reference thumbnails and names carried from the portfolio into onboarding.

## Client portal

- Project, Website and Account navigation, contextual panels and a mobile dock.
- Overview with the current revision, submitted or draft Direction count, remaining rounds and the next action.
- Initial Direction with editable text objects, uploaded attachments, links, drawings and recording controls. Recording depends on browser support and permission.
- Brief submission, update, lock and unlock simulations that do not consume a revision round.
- A Build history and internal check presentation.
- A working three-page Mori House website: Home, Menu and Visit, with navigation, menus, opening information, reservation connections and images.
- Review, Edit site and Browse modes with contextual instructions.
- Adjustable website preview width and height, image targeting and text targeting.
- Feedback attached to the page and target; meaningful text validation; image replacement proposals; drawings with editable vector strokes, undo and clearing.
- Revision batch submission with an acknowledgement and hold confirmation, withdrawal, revised delivery simulation and revision history.
- Read-only submitted batches, dynamic guidance and summaries, and the three-round allowance.
- Page-specific content editing for headings, descriptions, action text, destination links, image and alt text. Saving updates the local website preview while preserving the designed layout.
- Uploaded image validation, bounded compression and separate page images and drafts.
- Example analytics for 7, 30 and 90 days, chart and metric changes, source and page breakdowns and report export.
- Search title and description editing, counters, search result previews and simulated inspection results.
- Domain entry, record instructions, validation, primary-domain presentation and connection checks in the example journey.
- Booking, form, social and analytics connection controls with local configuration and test states.
- A scheduled State with name, alternate headline, weekday selections, start/end times, overnight validation, save, pause/resume and usual/alternate content previews.
- Billing with Site deposit and balance, Core and Pro, example upgrade and payment flows, transaction history and revision pricing.
- A launch checklist with approval, example balance settlement, domain checks and simulated publishing.
- Settings for timezone and notification preferences, local save, reset and draft export.
- Shared preview links preserving the active portal view.

## Reliability and boundaries

- Saved website content remains separate from unsaved drafts.
- Saves verify their written value. Failed saves retain the draft and previous saved website.
- Pending-draft recovery, malformed data validation, old-record migration and cross-tab conflict handling.
- Browser-local export, restore and reset. Delayed actions are guarded after resets or editing-context changes.
- Keyboard shortcuts, accessible dialog focus, mobile drawers, status announcements and short-screen layouts.
- The standalone portal and marketing preview use byte-identical public portal files.
- Browser edits and interactions work locally. Authentication, real team delivery, backend CMS, live search crawling, analytics collection, DNS verification, real payments and live publishing require future integrations.
- GitHub validation covers production builds, TypeScript, source/content tests, browser journeys and screenshot review. GitHub pushes do not update the existing manually deployed Vercel projects until deployment access or Git integration is configured.
