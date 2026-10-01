/** Contracts for the real customer-site adapter. No in-memory adapter is exported to runtime code. */
export type ContentField = {
  id: string;
  kind: "text" | "image" | "link";
  label: string;
  maxLength?: number;
  role?:
    "heading" | "body" | "action-label" | "action-link" | "image" | "image-alt";
};
export type SiteManifest = {
  siteId: string;
  revision: string;
  pages: { id: string; path: string; title: string; fields: ContentField[] }[];
  theme?: {
    layout: "editorial" | "immersive" | "product" | "expressive";
    background: string;
    ink: string;
    accent: string;
    name: string;
  };
};
export type SiteContent = {
  fields: Record<string, string>;
  seo: Record<string, { title: string; description: string; noindex: boolean }>;
};
export type PublishedVersion = {
  id: string;
  projectId: string;
  content: SiteContent;
  deployedAt: string;
  url: string;
  adapterReceipt: string;
};
export interface SiteAdapter {
  manifest(projectId: string): Promise<SiteManifest>;
  publish(input: {
    projectId: string;
    content: SiteContent;
    expectedRevision: string;
    idempotencyKey: string;
  }): Promise<PublishedVersion>;
  history(projectId: string): Promise<PublishedVersion[]>;
}
export function validateContent(manifest: SiteManifest, content: SiteContent) {
  const issues: string[] = [];
  if (
    !content ||
    !content.fields ||
    typeof content.fields !== "object" ||
    Array.isArray(content.fields) ||
    !content.seo ||
    typeof content.seo !== "object" ||
    Array.isArray(content.seo)
  )
    return ["Invalid website content."];
  const fields = new Map(
    manifest.pages.flatMap((p) => p.fields.map((f) => [f.id, f] as const)),
  );
  const pages = new Set(manifest.pages.map((p) => p.id));
  for (const [id, value] of Object.entries(content.fields)) {
    const f = fields.get(id);
    if (!f) {
      issues.push(`Unknown editable field: ${id}`);
      continue;
    }
    if (typeof value !== "string" || value.length > (f.maxLength || 10000)) {
      issues.push(`Invalid content: ${id}`);
      continue;
    }
    if (f.kind === "link" && value) {
      try {
        const u = new URL(value);
        if (!["https:", "mailto:", "tel:"].includes(u.protocol))
          issues.push(`Unsafe link: ${id}`);
      } catch {
        if (!/^\/(?!\/)/.test(value) && !/^#[a-zA-Z0-9_-]+$/.test(value))
          issues.push(`Invalid link: ${id}`);
      }
    }
    // Image references are private, ownership-checked asset IDs resolved by the adapter.
    if (f.kind === "image" && value && !/^[0-9a-f-]{36}$/i.test(value))
      issues.push(`Invalid image asset: ${id}`);
  }
  for (const [id, seo] of Object.entries(content.seo)) {
    if (!pages.has(id)) issues.push(`Unknown page: ${id}`);
    if (
      !seo ||
      typeof seo.title !== "string" ||
      typeof seo.description !== "string" ||
      !seo.title.trim() ||
      seo.title.length > 160 ||
      seo.description.length > 500 ||
      typeof seo.noindex !== "boolean"
    )
      issues.push(`Invalid search metadata: ${id}`);
  }
  return issues;
}
export class SiteService {
  constructor(private adapter: SiteAdapter) {}
  async publish(
    projectId: string,
    content: SiteContent,
    expectedRevision: string,
    key: string,
  ) {
    const manifest = await this.adapter.manifest(projectId);
    if (manifest.revision !== expectedRevision)
      throw new Error(
        "The website changed. Reload its content before publishing.",
      );
    const issues = validateContent(manifest, content);
    if (issues.length) throw new Error(issues.join("\n"));
    if (!key) throw new Error("A publish command key is required.");
    const result = await this.adapter.publish({
      projectId,
      content,
      expectedRevision,
      idempotencyKey: key,
    });
    if (
      result.projectId !== projectId ||
      !result.id ||
      !result.adapterReceipt ||
      !Number.isFinite(Date.parse(result.deployedAt)) ||
      !validSiteUrl(result.url)
    )
      throw new Error("The site adapter did not confirm a valid deployment.");
    return result;
  }
  async rollback(
    projectId: string,
    versionId: string,
    expectedRevision: string,
    key: string,
  ) {
    const version = (await this.adapter.history(projectId)).find(
      (v) => v.id === versionId && v.projectId === projectId,
    );
    if (!version) throw new Error("This website version is unavailable.");
    // Rollback creates a new verified deployment; history is never erased.
    return this.publish(projectId, version.content, expectedRevision, key);
  }
}
export function validSiteUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" ||
      (process.env.APP_ENV === "development" &&
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
    );
  } catch {
    return false;
  }
}
