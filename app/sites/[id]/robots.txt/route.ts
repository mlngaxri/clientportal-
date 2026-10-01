import { loadSite } from "../../../../lib/site/public";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const site = await loadSite((await params).id);
  if (!site) return new Response("User-agent: *\nDisallow: /", { status: 404 });
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${site.base}/sitemap.xml`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
