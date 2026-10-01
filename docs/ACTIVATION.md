# Fourthform activation and operating guide

The connected implementation is in this repository. Live provider accounts and the two existing Vercel URLs have not been activated by this build. Do not enable live payments until staging acceptance is recorded.

## 1. Database and account services

Create separate staging and production Supabase projects. Use `supabase link --project-ref <staging-ref>` and `supabase db push` to apply the migrations in order. Do not run a reset against a hosted customer database. Review the private `project-assets` bucket and RLS after migration.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The server role must remain server-only. Set `APP_URL` to the canonical HTTPS portal address and `APP_ENV=staging` or `production`. Production cookie security is controlled by Next.js `NODE_ENV`.

Configure the Supabase site URL and exact redirects for `/auth/callback` and `/auth/callback?next=/account/password`. Enable email confirmation and configure the Auth SMTP sender for a real hosted environment. Google credentials belong in Supabase provider settings. Google's authorized redirect is the Supabase `/auth/v1/callback` URL.

Use the Supabase administrator interface or an audited server-only script to set `app_metadata.role=operator` for the agency's own account. Customer-editable user metadata must never grant this role. Verify an unrelated account cannot read project records, files, drafts or enquiry messages.

## 2. Portal hosting

Connect this repository to the existing `fourthform-client-portal` Vercel project with Next.js detection. Clear an obsolete static `dist` output override if it exists. Configure the environment before building, since public Supabase variables are compiled into the client bundle. Rebuild after public configuration changes. Alternatively, add a scoped `VERCEL_TOKEN` repository secret after staging acceptance. The deployment workflow waits for successful validation of the exact current main commit, pulls production configuration, builds with that configuration and deploys the built artifact. Without the secret it reports an unconfigured deployment and performs no mutation. The marketing repository has the same validated deployment path.

Configure independent random secrets of at least 32 characters for `ANALYTICS_SIGNING_SECRET`, `SITE_ADAPTER_SIGNING_SECRET`, `CRON_SECRET` and `HEALTHCHECK_TOKEN`. Separate `RATE_LIMIT_SECRET` and `SESSION_SIGNING_SECRET` values are supported. A session proof defaults to the server key when no independent session secret is supplied; rotating that key signs users out. Run `npm run check:environment -- <private-environment-file>` for shape validation. This command never prints credential values and does not substitute for service acceptance.

Probe `/api/health` with the health bearer token from a trusted monitor. No anonymous health response reveals the database. The daily `/api/jobs/maintenance` cron uses `CRON_SECRET`. Customer actions also process queued notifications. Daily retries can take up to 24 hours after an outage; higher-volume operations should use a durable worker or a more frequent paid cron schedule.

## 3. Stripe

Use a test-mode Stripe secret in staging and an endpoint-specific signing secret. The webhook is `/api/webhooks/stripe`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `customer.subscription.created`, `updated`, `deleted`.

Configure the Stripe customer portal for payment-method changes and cancellation. Verify Site initial payment A$200, remaining balance A$1,300, each additional revision A$150, First A$199, and Pro A$39/month. The server controls prices. Returning from Checkout must show processing until the signed webhook settles the receipt.

Test duplicate events, a webhook-before-response race, abandoned/expired checkout, two simultaneous tabs, second additional-revision purchases, overdue subscriptions, cancellation, and resubscription. Verify a late event cannot change another project or credit a second round. `ENABLE_PRO_BILLING` and `ENABLE_FIRST_BILLING` remain false until their respective flows pass. `ENABLE_LIVE_CUSTOMERS` enables live-mode charging only after all acceptance is complete.

First's onboarding date is a customer declaration checked against the preceding six calendar months. Verify any additional agency eligibility policy before opening First billing.

## 4. Customer websites and domains

An operator connects the manifest in the project's agency setup panel, completes the build check, and delivers the managed `/review/<project-id>` URL. The customer can save draft content and review it privately. Launch prepares the exact saved revision, probes storage and deployment, checks page metadata, and binds five receipts before the SQL lifecycle can become LIVE.

For custom domains, configure a scoped `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` and optional team routing `VERCEL_TEAM_ID` for the same portal project. The client adds a domain, publishes `_fourthform.<hostname>` TXT ownership proof, then follows the actual provider's A/CNAME and any ownership challenge. The app checks HTTPS and a signed response from the intended project. A pending DNS setup remains pending. The agency does not buy or renew the client's domain.

Keep the included `/sites/<project-id>` address available as a fallback. Test a real controlled domain, canonical URL, sitemap, public form, visitor collection and private-API rejection on that domain before enabling customer domain setup. Up to five domain requests and one primary connected hostname are supported per project; changing unused requests is currently an agency operation.

## 5. Enquiries, notifications and media

Without Resend credentials, enquiries still commit to the private Inbox and notifications remain queued. Configure `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `RESEND_WEBHOOK_SECRET`. The raw-body delivery endpoint is `/api/webhooks/email`. Subscribe to delivered, bounced, complained, suppressed and failed email events. Use a dedicated sender/project and controlled staging recipient.

Verify actual inbox receipt, exactly-once enquiry submission, provider acceptance and delivered/bounced receipts. Delivery state is separate from send acceptance. Monitor `notification_outbox` through a trusted administrator. If `manual_review_required` appears after an ambiguous retry window, inspect provider logs before retrying; do not risk a duplicate send.

Images, audio, video and plain text use signed private uploads, bounded validation and short-lived downloads. Office/PDF documents require `FILE_SCAN_URL` and `FILE_SCAN_TOKEN`; the scanner receives bytes and returns JSON `{ "clean": true }`. Those documents cap at 16 MB. Other uploads default to 100 MiB. Verify the private bucket, MIME signature rejection and failed-scan handling. No scanner is provisioned by this code.

Back up customer Postgres data and Storage in the provider. Before applying future migrations, confirm restore procedures on staging. Recovery drafts stored on the device are only a temporary aid and never authoritative account storage.

## 6. Marketing activation

Deploy the marketing repository to its existing Vercel project. Set `NEXT_PUBLIC_CLIENT_PORTAL_URL` to the canonical portal origin. Once account, billing and hosted provider acceptance pass, set `NEXT_PUBLIC_CONNECTED_PORTAL=true` and rebuild. The marketing start links then forward known portfolio references and package choices to the real customer brief. The four example portal spaces remain independent and explicitly simulated.

## Acceptance still requiring provider access

Hosted Supabase configuration and restore, Google sign-in, hosted confirmation/recovery email, real Stripe test-mode checkout/webhooks/billing portal, Resend delivery/bounces, custom DNS/TLS, malware scanner and both production Vercel deployments require provider credentials and staging evidence. Do not record these as passed on the strength of disposable database tests.
