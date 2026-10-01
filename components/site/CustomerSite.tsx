import { sitePageUrl } from "../../lib/site/service";
import type { CSSProperties } from "react";
import Script from "next/script";
import type { loadSite } from "../../lib/site/public";
import { fieldValue } from "../../lib/site/schema";
import ContactForm from "./ContactForm";
type Site = NonNullable<Awaited<ReturnType<typeof loadSite>>>;
export default function CustomerSite({
  site,
  pageId,
  review = false,
}: {
  site: Site;
  pageId: string;
  review?: boolean;
}) {
  const { manifest, content, project } = site;
  const theme = manifest.theme || {
    layout: "editorial",
    name: project.name,
    background: "#f3f1e9",
    ink: "#191a18",
    accent: "#d8ddc8",
  };
  const page = manifest.pages.find((p) => p.id === pageId)!;
  const value = (role: string) => fieldValue(manifest, content, pageId, role);
  const fieldId = (role: string) =>
    page.fields.find((f) => f.role === role)?.id;
  const image = value("image"),
    link = value("action-link") || "#contact";
  const linkUrl =
    link.startsWith("/") && !link.startsWith("//")
      ? sitePageUrl(site.base, link)
      : link;
  return (
    <main
      className={`customer-site customer-${theme.layout}`}
      style={
        {
          "--site-bg": theme.background,
          "--site-ink": theme.ink,
          "--site-accent": theme.accent,
        } as CSSProperties
      }
    >
      {review && (
        <div className="customer-review-bar">
          <span>
            <span className="ff-mark" aria-hidden="true" />
            fourthform
          </span>
          <span>Private website review</span>
        </div>
      )}
      <nav className="customer-nav" aria-label="Website navigation">
        <a className="customer-brand" href={sitePageUrl(site.base, "/")}>
          {theme.name}
        </a>
        <div>
          {manifest.pages.map((p) => (
            <a
              key={p.id}
              href={sitePageUrl(site.base, p.path)}
              aria-current={p.id === pageId ? "page" : undefined}
            >
              {p.title}
            </a>
          ))}
        </div>
        <a href="#contact">Get in touch ↗</a>
      </nav>
      <section className="customer-hero">
        <div className="customer-hero-copy">
          <span className="customer-eyebrow">{theme.name}</span>
          <h1 data-fourthform-id={fieldId("heading")}>
            {value("heading") || page.title}
          </h1>
          <p data-fourthform-id={fieldId("body")}>{value("body")}</p>
          <a
            className="customer-action"
            data-fourthform-id={fieldId("action-label")}
            data-fourthform-event="cta"
            href={linkUrl}
          >
            {value("action-label") || "Get in touch"}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        {image && (
          <div className="customer-image">
            <img
              src={
                review
                  ? `/api/assets/${image}`
                  : `/api/public-assets/${image}?project=${project.id}`
              }
              alt={value("image-alt")}
              data-fourthform-id={fieldId("image")}
            />
          </div>
        )}
      </section>
      {page.fields
        .filter((f) => !f.role)
        .map((f) => (
          <section className="customer-section" key={f.id}>
            {f.kind === "text" ? (
              <>
                <span className="customer-eyebrow">{f.label}</span>
                <p data-fourthform-id={f.id}>{content.fields[f.id]}</p>
              </>
            ) : f.kind === "link" ? (
              <a
                data-fourthform-id={f.id}
                href={content.fields[f.id] || "#contact"}
              >
                {f.label} ↗
              </a>
            ) : content.fields[f.id] ? (
              <img
                data-fourthform-id={f.id}
                src={
                  review
                    ? `/api/assets/${content.fields[f.id]}`
                    : `/api/public-assets/${content.fields[f.id]}?project=${project.id}`
                }
                alt={f.label}
              />
            ) : null}
          </section>
        ))}
      <ContactForm projectId={project.id} pageId={pageId} review={review} />
      <footer className="customer-footer">
        <strong>{theme.name}</strong>
        <div>
          {site.connections.booking && (
            <a href={site.connections.booking} data-fourthform-event="cta">
              Make a booking ↗
            </a>
          )}
          {site.connections.social && (
            <a href={site.connections.social}>Follow us ↗</a>
          )}
        </div>
      </footer>
      {review ? (
        <Script
          src="/review-bridge.js"
          strategy="afterInteractive"
          data-parent-origin={
            new URL(process.env.APP_URL || "http://localhost:4173").origin
          }
        />
      ) : (
        <Script
          src="/site-analytics.js"
          strategy="afterInteractive"
          data-project={project.id}
          data-page={pageId}
        />
      )}
    </main>
  );
}
