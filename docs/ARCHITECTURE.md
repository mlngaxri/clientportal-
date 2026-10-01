# Fourthform connected architecture

## Application boundary

The marketing repository owns the editorial website, 20 interactive studio concepts, and four focused public demo spaces. The portal repository owns authenticated customer operations and the built-in renderer for delivered websites. Marketing `/start` forwards a validated reference and package choice to the real portal. `NEXT_PUBLIC_CONNECTED_PORTAL=true` switches marketing calls to action after production activation.

| Capability | Authoritative source | Behavior |
| --- | --- | --- |
| Accounts | Supabase Auth | Email/password, email confirmation, Google OAuth callback, recovery, verified server sessions and logout |
| Project ownership | Postgres RLS | A customer reads their projects; an operator is identified only through trusted app metadata |
| Brief and Directions | Versioned boards | Acknowledged saves, local recovery, submitted snapshots, contextual targets and drawings |
| Revisions | Locked SQL lifecycle | Three Site rounds or one First round, deliberate submission, immutable sent content, withdrawal before work begins |
| CMS | site_documents and immutable site_versions | Save drafts separately, publish atomically, retry safely and restore historical versions |
| Customer websites | Server-rendered published snapshots | Real pages, safe editable fields, uploaded imagery, SEO metadata, navigation, contact forms, sitemap and robots |
| Media | Private Supabase Storage | Direct signed uploads, metadata and byte signatures, short-lived authenticated download redirects |
| Enquiries | form_submissions | Persisted inbox, read/archive states, pagination, replay protection and an atomic notification outbox |
| Analytics | Anonymous aggregate events | Daily visitor estimates, page views, action clicks and actual enquiry counts; Pro adds comparisons and longer reports |
| Search | Delivered HTML plus published metadata | HTTP inspection and measured content guidance, without claiming ranking or indexing outcomes |
| States | Validated schedules and Pro entitlement | Timezone-aware request-time overrides, overnight windows, conflict fallback and usual content after cancellation |
| Domains | Ownership TXT, Vercel configuration and signed TLS probe | Hosting instructions, ownership verification, exact-deployment checks and tenant routing |
| Payments | Reserved Stripe Checkout and signed webhooks | Initial/final/revision receipts, Pro subscriptions, replay protection and provider-owned billing management |
| Notifications | Private leased outbox and signed Resend receipts | Retry/backoff, provider idempotency, accepted versus delivered status and manual review for ambiguous long retries |
| Operations | Protected health endpoint and daily maintenance | Database health, queue retry, 90-day traffic retention and orphaned-upload cleanup |

## Data invariants

A saved board or content version must be acknowledged by the database. A network timeout retains the request key so the same command can be retried. A reused key with a changed payload is rejected. Stale revisions cannot overwrite newer work. A published snapshot never changes when a draft is edited. Rollback creates another immutable version.

A successful checkout return is never a payment receipt. Provider events must match an owner reservation, project, currency and expected amount. Pro entitlement is derived from active subscriptions. Canceled and overdue subscriptions stop scheduled overrides. Old webhook retries cannot add another revision or undo a newer subscription event.

Launch requires approval, the appropriate settled payments, and five fresh checks tied to the exact saved site revision. The deployment check uses a short-lived signed probe. The form and analytics checks write through the real database and remove probe records in the same transaction. They create no invented visitors or enquiries.

Only media referenced by a published website can be served anonymously. Private board media requires project membership. Documents requiring malware scanning fail closed when no scanner exists. Customer-provided URLs cannot direct inspection to private networks; public HTTPS requests pin verified DNS addresses and refuse redirects.

Custom customer hosts expose only their public website and permitted collection endpoints. Portal accounts and private APIs remain on the canonical agency host. Domain resolution returns a public project identifier, never a draft or private content.

## Rendering and extension

The built-in CMS is the completed default implementation. Operators connect a typed manifest of pages, stable field IDs, content and one of four layout families. Customers edit text, image selections, links and search metadata. Agency developers can extend the renderer to introduce bespoke components. Arbitrary customer HTML or scripts are not accepted.

An optional authenticated external CMS adapter remains available for an agency-owned publishing system. Its deployment, receipts and isolated review origin must be validated independently. The built-in path does not depend on that optional adapter.

Analytics are cookie-free and respect Do Not Track and Global Privacy Control. IP addresses and user agents are used only for a rotating, project-specific daily estimate and are not stored as raw values. Daily estimates should not be read as unique people across a whole reporting period. Automated traffic is excluded, so reports are intentionally incomplete.

## Verification boundary

Local tests execute actual PostgreSQL migrations through PGlite and test RLS, command replay, stale saves, immutable submissions, payment receipts and website history. CI runs a production Next.js build with real disposable Supabase Auth, Postgres and Storage, then drives the customer journey in Chromium.

Live Stripe settlement, Google OAuth, hosted email confirmation/recovery, Resend delivery, external DNS/TLS and production Vercel activation require configured staging and provider acceptance. Test fixtures and source implementation are not evidence that those accounts are active.
