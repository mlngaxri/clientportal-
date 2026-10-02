import type { SiteManifest, SiteContent } from "./site/service";
export function contentChanges(manifest: SiteManifest, before: SiteContent | null, after: SiteContent) {
  const changes: { label: string; before: string; after: string }[] = [];
  for (const page of manifest.pages) {
    for (const field of page.fields) {
      const old = before?.fields[field.id] || "", value = after.fields[field.id] || "";
      if (old !== value) changes.push({ label: `${page.title}: ${field.label}`, before: field.kind === "image" ? (old ? "Previous image" : "No image") : old, after: field.kind === "image" ? (value ? "New image" : "No image") : value });
    }
    for (const key of ["title", "description", "noindex"] as const) {
      const old = String(before?.seo[page.id]?.[key] ?? ""), value = String(after.seo[page.id]?.[key] ?? "");
      if (old !== value) changes.push({ label: `${page.title}: ${key === "noindex" ? "Search visibility" : `Search ${key}`}`, before: old, after: value });
    }
  }
  return changes;
}
