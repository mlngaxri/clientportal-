import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSite } from "../../../../lib/site/public";
import CustomerSite from "../../../../components/site/CustomerSite";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; path?: string[] }> };
async function sitePage(params: Props["params"]) {
  const { id, path = [] } = await params;
  const site = await loadSite(id);
  const page = site?.manifest.pages.find(
    (p) => p.path === `/${path.join("/")}` || p.path === `/${path.join("/")}/`,
  );
  if (!site || !page) notFound();
  return { site, page };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, page } = await sitePage(params);
  const seo = site.content.seo[page.id];
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: site.base + page.path },
    robots: { index: !seo.noindex, follow: !seo.noindex },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: site.base + page.path,
    },
  };
}
export default async function Page({ params }: Props) {
  const { site, page } = await sitePage(params);
  return <CustomerSite site={site} pageId={page.id} />;
}
