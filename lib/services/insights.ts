import type { SiteManifest, SiteContent } from "../site/service";
export function searchInsights(manifest: SiteManifest, content: SiteContent) {
  const insights: string[] = [],
    titles = new Map<string, string[]>();
  for (const page of manifest.pages) {
    const seo = content.seo[page.id],
      title = seo.title.trim().toLowerCase();
    titles.set(title, [...(titles.get(title) || []), page.title]);
    if (seo.noindex)
      insights.push(
        `${page.title} is intentionally excluded from search results. Confirm this is still the intended visibility.`,
      );
    if (!seo.description.trim())
      insights.push(
        `${page.title} has no search description. Add a concise account of what visitors will find.`,
      );
    if (seo.title.length > 60)
      insights.push(
        `${page.title} has a long search title (${seo.title.length} characters). Keep its essential words near the beginning.`,
      );
    const heading = page.fields.find((f) => f.role === "heading");
    if (heading && !content.fields[heading.id]?.trim())
      insights.push(
        `${page.title} has an empty main heading. Give visitors a clear introduction.`,
      );
  }
  for (const pages of titles.values())
    if (pages.length > 1)
      insights.push(
        `${pages.join(", ")} share a search title. Give each page a distinct description of its purpose.`,
      );
  return insights.length
    ? insights
    : [
        "Each published page has its own search title and description. Continue reviewing actual visitor activity and enquiries before changing your content.",
      ];
}
