import { searchInsights } from "../../../../../lib/services/insights";
import { ownedProject, failure } from "../../../../../lib/server";
import { loadSite } from "../../../../../lib/site/public";
import { appOrigin } from "../../../../../lib/site/builtin";
import { publicHttps } from "../../../../../lib/services/network";
import { inspectHtml } from "../../../../../lib/services/seo";
import { rateLimit } from "../../../../../lib/security/abuse";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user, project } = await ownedProject(id);
    await rateLimit("search-inspect", user.id, 10);
    if (project.phase !== "LIVE")
      throw new Error("Search inspection is available after launch.");
    const site = await loadSite(id);
    if (!site) throw new Error("Your website is unavailable.");
    const pageId =
      new URL(req.url).searchParams.get("page") || site.manifest.pages[0].id;
    const page = site.manifest.pages.find((p) => p.id === pageId);
    if (!page) throw new Error("Unknown website page.");
    const url = site.base + page.path;
    let r;
    if (
      process.env.APP_ENV === "development" &&
      url.startsWith(appOrigin() + "/") &&
      new URL(url).protocol === "http:"
    ) {
      const response = await fetch(url, {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      r = { status: response.status, body: await response.text() };
    } else r = await publicHttps(url);
    return Response.json({
      url,
      pageId,
      checkedAt: new Date().toISOString(),
      checks: inspectHtml(r.body, url, r.status),
      insights: project.pro
        ? searchInsights(site.manifest, site.content)
        : null,
    });
  } catch (e) {
    return failure(e);
  }
}
