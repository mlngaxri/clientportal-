import { z } from "zod";
import {
  ownedProject,
  admin,
  checkOrigin,
  failure,
} from "../../../../../lib/server";
import { publicHostname } from "../../../../../lib/services/network";
import {
  verifyOwnership,
  attachDomain,
  checkDeployment,
  hostingCall,
  hostingRecords,
} from "../../../../../lib/services/domains";
import { appOrigin } from "../../../../../lib/site/builtin";
import { rateLimit } from "../../../../../lib/security/abuse";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await ownedProject(id);
    const { data, error } = await client
      .from("site_domains")
      .select("*")
      .eq("project_id", id)
      .order("created_at");
    if (error) throw error;
    return Response.json({
      domains: data || [],
      platformUrl: `${appOrigin()}/sites/${id}`,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { client, user } = await ownedProject(id);
    await rateLimit("domains", user.id, 10, 3600);
    const body = z
      .object({
        action: z.enum(["reserve", "connect"]),
        hostname: z.string().max(253),
      })
      .strict()
      .parse(await req.json());
    const hostname = publicHostname(body.hostname);
    if (
      hostname === new URL(appOrigin()).hostname ||
      hostname.endsWith(".vercel.app")
    )
      throw new Error("Choose your own domain name.");
    const { data: domain, error } = await client.rpc("reserve_site_domain", {
      pid: id,
      host: hostname,
    });
    if (error) throw new Error(error.message);
    let records: unknown = null,
      provider: any = null,
      notice =
        "Add the ownership TXT record, then check and connect this domain.",
      status = domain.status;
    if (body.action === "connect") {
      await verifyOwnership(hostname, domain.token);
      await admin()
        .from("site_domains")
        .update({ status: "owned" })
        .eq("hostname", hostname)
        .eq("project_id", id);
      const attached = await attachDomain(hostname);
      records = attached.config;
      provider = attached.domain;
      status = "owned";
      if (!attached.ready)
        return Response.json({
          domain: { ...domain, status },
          hosting: hostingRecords(hostname, records, provider),
          notice:
            "Ownership is verified. Add the hosting records below, allow DNS to propagate, then check again.",
        });
      const { data: d } = await client
        .from("site_documents")
        .select("revision")
        .eq("project_id", id)
        .single();
      if (!d)
        throw new Error(
          "Your website must be set up before its domain connects.",
        );
      await checkDeployment(id, d.revision, `https://${hostname}`);
      const { error: binding } = await admin().rpc("connect_site_domain", {
        pid: id,
        host: hostname,
      });
      if (binding) throw binding;
      status = "connected";
      notice = "Domain connected and HTTPS verified.";
    }
    try {
      if (!records)
        records = await hostingCall(
          `/v6/domains/${encodeURIComponent(hostname)}/config`,
        );
    } catch {}
    return Response.json({
      domain: { ...domain, status },
      ownership: {
        type: "TXT",
        name: `_fourthform.${hostname}`,
        value: `fourthform=${domain.token}`,
      },
      hosting: hostingRecords(hostname, records, provider),
      notice,
    });
  } catch (e) {
    return failure(e);
  }
}
