# Fourthform client portal

A complete interactive product preview, using the Mori House example project. Includes Initial Direction, media/drawing references, Review, revision submission and withdrawal, page content editing, search appearance, sample analytics, domains, connections, scheduled States, Core/Pro billing and launch checks.

## Local development

Requires Node.js 22+. Run `npm run dev` and open http://localhost:4173. No runtime dependencies or environment variables are needed. Run `npm test` for static build integrity and `npm run build` to produce `dist`.

## Deployment

Import this repository into the Vercel project serving https://fourthform-client-portal.vercel.app/. `vercel.json` supplies the build command and output directory. This commit does not itself link or deploy the Vercel project.

The marketing repository includes the same portal under `public/portal-preview` so onboarding and embedded preview share browser storage. Update that copy when changing the standalone portal.

## Preview boundary

All data stays in this browser. The UI does not create accounts, charge cards, crawl live SEO, collect real analytics, verify DNS or publish customer sites. Media capture uses the browser permission flow where supported. Do not enter sensitive customer information. Save confirms a device copy; Export saves a JSON draft; Reset restores the sample. Product and keyboard/mobile checks are documented in `docs/LOCAL_ACCEPTANCE.md`.

Source is separated into `public/portal-operations.js`, `portal-communication.js`, `portal-reliability.js`, and visual integration files. `public/index.html` contains the original shell and sample website. Fonts and photography are hosted locally.
