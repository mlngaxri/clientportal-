# Fourthform client portal

The connected customer application for Fourthform. Next.js handles verified accounts, a persistent website CMS, private project media, contextual review, revisions, enquiries, analytics, search inspection, billing reconciliation and launch checks. Supabase provides Auth, Postgres and private Storage. Stripe, Resend and Vercel integrations activate when their accounts are configured.

The independent example portal remains at `/preview` and `/index.html`. Its data stays in the browser. The marketing site embeds that example, while actual customer work runs in `/app`, `/projects` and `/start`.

## Run locally

Use Node.js 22+, `npm ci`, Supabase CLI and Docker. Run `supabase start`, copy `.env.example` into `.env.local`, and enter the local credentials from `supabase status`. Use `APP_URL=http://localhost:4173` and `APP_ENV=development`. `npm run dev` starts the application at port 4173. Never commit environment files.

`npm run typecheck` checks TypeScript. `npm test` checks preview integrity, authentication rules, lifecycle transitions, database permissions, persistent CMS, upload validation and service security. The GitHub workflow builds the production application and exercises a full browser journey against isolated real Supabase services. Payment lifecycle tests use explicit administrator fixtures; they do not claim a Stripe payment.

## Deploy and activate

Use the existing Next.js Vercel project for this repository. Apply all migrations to a separate staging database first. Configure server secrets and exact authentication callbacks, then complete the provider acceptance steps in [ACTIVATION.md](docs/ACTIVATION.md). Turn on billing and the marketing customer funnel only after acceptance. A GitHub push by itself does not prove the existing Vercel projects are linked or deployed.

[ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the data model and invariants. [ACTIVATION.md](docs/ACTIVATION.md) gives deployment, service configuration, recovery and remaining production acceptance work.

[RELEASE.md](docs/RELEASE.md) records the connected release scope and verification boundary.
