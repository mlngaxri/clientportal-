import { notFound, redirect } from "next/navigation";
import { loadSite } from "../../../../lib/site/public";
import CustomerSite from "../../../../components/site/CustomerSite";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private website review | Fourthform",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; path?: string[] }>;
}) {
  const { id, path = [] } = await params;
  let site;
  try {
    site = await loadSite(id, true);
  } catch {
    redirect(
      `/start?next=${encodeURIComponent(`/review/${id}/${path.join("/")}`)}`,
    );
  }
  const page = site?.manifest.pages.find(
    (p) => p.path === `/${path.join("/")}` || p.path === `/${path.join("/")}/`,
  );
  if (!site || !page) notFound();
  return <CustomerSite site={site} pageId={page.id} review />;
}
