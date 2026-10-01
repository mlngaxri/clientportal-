export type SearchCheck = {
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
};
function meta(html: string, name: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return (
    tags
      .find((t) => new RegExp(`\\bname=["']${name}["']`, "i").test(t))
      ?.match(/\bcontent=["']([^"']*)["']/i)?.[1] || ""
  );
}
export function inspectHtml(
  html: string,
  expectedUrl: string,
  status = 200,
): SearchCheck[] {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "",
    description = meta(html, "description"),
    robots = meta(html, "robots");
  const canonical = (html.match(/<link\b[^>]*>/gi) || [])
    .find((t) => /\brel=["']canonical["']/i.test(t))
    ?.match(/\bhref=["']([^"']*)["']/i)?.[1];
  const headings = (html.match(/<h1(?:\s|>)/gi) || []).length;
  const images = html.match(/<img\b[^>]*>/gi) || [],
    missing = images.filter((t) => !/\balt=["'][^"']*["']/i.test(t)).length;
  return [
    {
      label: "Page response",
      status: status === 200 ? "pass" : "fail",
      detail: `HTTP ${status}`,
    },
    {
      label: "Search title",
      status: !title ? "fail" : title.length > 60 ? "warning" : "pass",
      detail: title
        ? `${title.length} characters. ${title.length > 60 ? "A shorter title may display more clearly." : "A title is present."}`
        : "Add a search title.",
    },
    {
      label: "Search description",
      status: !description
        ? "warning"
        : description.length > 160
          ? "warning"
          : "pass",
      detail: description
        ? `${description.length} characters. ${description.length > 160 ? "A shorter description may display more clearly." : "A description is present."}`
        : "Add a useful summary of this page.",
    },
    {
      label: "Canonical address",
      status: canonical === expectedUrl ? "pass" : "fail",
      detail:
        canonical === expectedUrl
          ? "Matches the published page address."
          : "The page address and canonical tag differ.",
    },
    {
      label: "Main heading",
      status: headings === 1 ? "pass" : "warning",
      detail: `${headings} main heading${headings === 1 ? "" : "s"}. Aim for one clear page heading.`,
    },
    {
      label: "Image descriptions",
      status: missing ? "warning" : "pass",
      detail: missing
        ? `${missing} images have no alt attribute.`
        : "Image alt attributes are present.",
    },
    {
      label: "Indexing",
      status: /noindex/i.test(robots) ? "warning" : "pass",
      detail: /noindex/i.test(robots)
        ? "This page asks search engines not to index it."
        : "This page permits indexing. Search engines decide whether to include it.",
    },
  ];
}
