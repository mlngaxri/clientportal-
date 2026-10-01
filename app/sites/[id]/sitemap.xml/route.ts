import { sitePageUrl } from "../../../../lib/site/service";
import { loadSite } from "../../../../lib/site/public";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const site = await loadSite(id);
  if (!site) return new Response(null, { status: 404 });
  const escape = (s: string) =>
    s.replace(
      /[<>&'\"]/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          "'": "&apos;",
          '\"': "&quot;",
        })[c]!,
    );
  const urls = site.manifest.pages
    .filter((p) => !site.content.seo[p.id].noindex)
    .map(
      (p) => `<url><loc>${escape(sitePageUrl(site.base, p.path))}</loc></url>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-store",
      },
    },
  );
}
