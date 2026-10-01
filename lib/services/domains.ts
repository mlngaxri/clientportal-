import "server-only";
import { resolveTxt } from "node:dns/promises";
import { publicHostname, publicHttps } from "./network";
import { createProbe, signedEqual } from "./probes";
import { appOrigin } from "../site/builtin";
export async function hostingCall(
  path: string,
  method = "GET",
  body?: unknown,
) {
  if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID)
    throw new Error(
      "Domain hosting is not configured yet. Your domain request is saved.",
    );
  const url = new URL(path, "https://api.vercel.com");
  if (process.env.VERCEL_TEAM_ID)
    url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
    cache: "no-store",
  });
  const value = await r.json();
  if (!r.ok)
    throw new Error(
      "Hosting could not confirm this domain. Check its DNS records and try again.",
    );
  return value;
}
export async function verifyOwnership(host: string, token: string) {
  publicHostname(host);
  const records = await resolveTxt(`_fourthform.${host}`).catch(() => []);
  if (!records.some((r) => r.join("") === `fourthform=${token}`))
    throw new Error(
      "Add the ownership TXT record before connecting this domain.",
    );
}
export async function attachDomain(host: string) {
  const path = `/v9/projects/${encodeURIComponent(process.env.VERCEL_PROJECT_ID || "")}/domains`;
  let domain;
  try {
    domain = await hostingCall(`${path}/${encodeURIComponent(host)}`);
  } catch {
    domain = await hostingCall(path, "POST", { name: host });
  }
  if (domain.projectId && domain.projectId !== process.env.VERCEL_PROJECT_ID)
    throw new Error("Hosting did not confirm the intended project.");
  if (!domain.verified) {
    try {
      domain = await hostingCall(
        `${path}/${encodeURIComponent(host)}/verify`,
        "POST",
      );
    } catch {
      /* Keep the provider’s ownership challenge visible while DNS propagates. */
    }
  }
  const config = await hostingCall(
    `/v6/domains/${encodeURIComponent(host)}/config`,
  );
  return {
    domain,
    config,
    ready: domain.verified === true && config.misconfigured === false,
  };
}
export async function checkDeployment(
  projectId: string,
  revision: number,
  origin = appOrigin(),
) {
  const probe = createProbe(projectId, revision),
    url = `${origin}/api/site-health`;
  let result;
  if (
    origin === appOrigin() &&
    process.env.APP_ENV === "development" &&
    new URL(origin).protocol === "http:"
  ) {
    const r = await fetch(url, {
      headers: { "x-fourthform-probe": probe.token },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    result = {
      status: r.status,
      body: await r.text(),
      headers: {
        "x-fourthform-signature": r.headers.get("x-fourthform-signature") || "",
      },
    };
  } else result = await publicHttps(url, { "x-fourthform-probe": probe.token });
  if (
    result.status !== 200 ||
    !signedEqual(result.body, result.headers["x-fourthform-signature"] || "")
  )
    throw new Error(
      "The website deployment could not be verified. Try again once hosting is ready.",
    );
  const body = JSON.parse(result.body);
  if (
    body.projectId !== projectId ||
    body.revision !== revision ||
    body.nonce !== probe.value.nonce
  )
    throw new Error("The deployment returned a different website version.");
  return body;
}

export function hostingRecords(host: string, config: any, domain?: any) {
  const ipv4 =
    [...(config?.recommendedIPv4 || [])].sort(
      (a, b) => Number(a.rank) - Number(b.rank),
    )[0]?.value || [];
  const cname = [...(config?.recommendedCNAME || [])].sort(
    (a, b) => Number(a.rank) - Number(b.rank),
  )[0]?.value;
  return [
    ...ipv4
      .filter((v: unknown) => typeof v === "string")
      .map((value: string) => ({
        type: "A",
        name: host,
        value,
        purpose: "Root domain",
      })),
    ...(typeof cname === "string"
      ? [
          {
            type: "CNAME",
            name: host,
            value: cname,
            purpose: "Subdomain alternative",
          },
        ]
      : []),
    ...(domain?.verification || [])
      .filter(
        (v: any) =>
          v.type === "TXT" &&
          typeof v.domain === "string" &&
          typeof v.value === "string",
      )
      .map((v: any) => ({
        type: "TXT",
        name: v.domain,
        value: v.value,
        purpose: "Hosting ownership",
      })),
  ];
}
