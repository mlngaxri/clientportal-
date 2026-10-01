import "server-only";
import { appOrigin } from "./builtin";
import { admin } from "../server";
export async function publicSiteOrigin(req: Request, id: string) {
  const origin = req.headers.get("origin");
  if (!origin) throw new Error("Invalid request origin.");
  if (origin === appOrigin()) return;
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin)
    throw new Error("Invalid request origin.");
  const { data, error } = await admin()
    .from("site_domains")
    .select("project_id")
    .eq("hostname", url.hostname)
    .eq("status", "connected")
    .eq("project_id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Invalid request origin.");
}
