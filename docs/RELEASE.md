# Fourthform connected system release

The portal now contains the connected implementation. The public example portal remains independently available at `/preview`; authenticated customer work uses `/app`, `/start` and `/projects`. The marketing repository retains the studio showcase and four focused demo spaces, with an explicit switch for the connected onboarding funnel.

| Delivered architecture | Connected behavior |
| --- | --- |
| Accounts and projects | Supabase Auth, signed session lifetimes, password recovery, owner isolation and trusted agency roles |
| Direction and review | Persistent boards, private uploads, element feedback, immutable submissions and revision accounting |
| Customer websites | Typed CMS, private drafts, immutable publication history, rollback, four layout families and public page rendering |
| Website operations | Persisted enquiry inbox, privacy-aware visitor reports, delivered-HTML search inspection and Pro schedules |
| Commerce and delivery | Reserved Stripe checkout, signed reconciliation, subscription management, verified domain routing and launch receipts |
| Agency operations | Site registration, build delivery, leased notification outbox, protected health, retention and safe upload cleanup |

## Verification

The [portal validation workflow](https://github.com/mlngaxri/clientportal-/actions/workflows/validate.yml) builds the production application, checks TypeScript, runs preview/backend/configuration tests and exercises 23 browser flow checks against real disposable Supabase Auth, Postgres, Storage and SMTP. These cover independent sessions, denied cross-account access, private uploads, immutable review, launch gates, publishing, rollback, actual HTTP inspection, enquiries, analytics, cancellation, mobile content, protected maintenance, logout and password recovery. Its artifact includes screenshots and structured results. Stripe payment lifecycle tests use explicitly identified administrator receipts.

The [marketing validation workflow](https://github.com/mlngaxri/marketingwebsite-/actions/workflows/validate.yml) builds the site and checks the portfolio, desktop motion, public demo journeys, keyboard interaction, responsive layouts and content consistency. Desktop and mobile screenshots have been visually reviewed.

## Production activation

Hosted Supabase, Google OAuth, hosted email, Stripe checkout and provider webhooks, Resend delivery, custom DNS/TLS, document scanning and both Vercel production deployments still require configured accounts and staging acceptance. The connected marketing switch and optional live billing gates remain closed. Existing Vercel deployments have not been replaced by this connected release.

Deployment workflows accept only a successfully validated current main commit. They pull production configuration and deploy a built artifact when the repository deployment token is configured; otherwise they report an unconfigured deployment and skip deployment steps. A successful workflow status alone does not mean a deployment occurred.

Follow [ACTIVATION.md](ACTIVATION.md) for exact configuration and provider acceptance. [ARCHITECTURE.md](ARCHITECTURE.md) records data boundaries, replay guarantees and adapter contracts. The included renderer supports four layout families; bespoke customer components require agency development. Daily maintenance is bounded and notification retries may take up to 24 hours. Higher-volume operations need a durable worker or a more frequent schedule.

## Historical preview milestone

The following record describes the earlier browser-only preview scope, before the connected implementation above.

The preview scope is finalized: an editorial marketing site with Site/First onboarding, and a standalone/embedded Mori House portal demonstrating Direction, review, editing, CMS, search inspection, analytics, connections, States, billing and launch.

The portal copies are identical. Browser-local persistence and recovery are verified. Accounts, live CMS services, SEO crawling, analytics collection, DNS verification, payments and publishing remain illustrative, as requested. Saved onboarding details seed Initial Direction in the example workspace.

Final acceptance runs in GitHub validation: production build, TypeScript and rendered-markup checks, twelve portal model/build/content tests, five marketing content/markup tests, and 90 browser flow checks plus an animated visual tour. Browser evidence covers five viewport widths, keyboard navigation, motion preferences, success journeys, failed saves, uploads, draft recovery, cross-tab conflicts, closed-dialog focus, delayed actions after Reset, and short landscape screens. Screenshots and JSON results are available in the validation artifact.

Deployment remains the existing Vercel/GitHub project configuration. These changes do not link or manually deploy a Vercel project.
