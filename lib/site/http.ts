import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { SiteAdapter, SiteContent } from "./service";
import { BuiltinSiteAdapter } from "./builtin";
const field = z.object({ id: z.string().min(1), kind: z.enum(["text", "image", "link"]), label: z.string().min(1), maxLength: z.number().int().positive().max(10000).optional() }).strict();
const manifest = z.object({ siteId: z.string().min(1), revision: z.string().min(1), pages: z.array(z.object({ id: z.string().min(1), path: z.string().regex(/^\/(?!\/)/), title: z.string(), fields: z.array(field).max(200) }).strict()).min(1).max(100) }).strict();
const content = z.object({ fields: z.record(z.string(), z.string()), seo: z.record(z.string(), z.object({ title: z.string(), description: z.string(), noindex: z.boolean() }).strict()) }).strict();
const version = z.object({ id: z.string().min(1), projectId: z.uuid(), content, deployedAt: z.iso.datetime(), url: z.url().refine((v) => new URL(v).protocol === "https:"), adapterReceipt: z.string().min(1), revision: z.string().optional() }).strict();
/** Trusted, owner-configured adapter. Every response is authenticated and bound to this request. */
export class HttpSiteAdapter implements SiteAdapter {
  private origin: string;
  constructor(private endpoint: string, private key: string, allowedOrigin: string) {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.origin !== allowedOrigin || url.username || url.password || url.search || url.hash || !key || key.length < 32) throw new Error("The website publishing connection is not configured.");
    if (/^(localhost|.*\.localhost|.*\.local|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(url.hostname)) throw new Error("Use a public website adapter hostname.");
    this.origin = url.origin;
  }
  private async call<T>(action: string, projectId: string, data: unknown, schema: z.ZodType<T>): Promise<T> {
    const nonce = randomUUID();
    const timestamp = String(Date.now());
    const body = JSON.stringify({ action, projectId, nonce, timestamp, data });
    const signature = createHmac("sha256", this.key).update(body).digest("hex");
    const response = await fetch(this.endpoint, { method: "POST", headers: { "content-type": "application/json", "x-fourthform-signature": signature }, body, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("The website connection could not complete this request. Your saved work is preserved.");
    if (Number(response.headers.get("content-length") || 0) > 4000000) throw new Error("Website adapter response is too large.");
    const raw = await response.text();
    if (Buffer.byteLength(raw) > 4000000) throw new Error("Website adapter response is too large.");
    const signed = response.headers.get("x-fourthform-signature") || "";
    const expected = createHmac("sha256", this.key).update(raw).digest("hex");
    if (!/^[a-f0-9]{64}$/.test(signed) || !timingSafeEqual(Buffer.from(signed, "hex"), Buffer.from(expected, "hex"))) throw new Error("The website connection did not return a verified receipt.");
    const envelope = z.object({ nonce: z.literal(nonce), projectId: z.literal(projectId), data: schema }).strict().parse(JSON.parse(raw));
    return envelope.data;
  }
  async manifest(projectId: string) {
    const result = await this.call("manifest", projectId, {}, manifest);
    const ids = result.pages.flatMap((p) => p.fields.map((f) => f.id));
    if (new Set(ids).size !== ids.length || new Set(result.pages.map((p) => p.id)).size !== result.pages.length) throw new Error("The website manifest contains duplicate fields or pages.");
    return result;
  }
  async publish(input: { projectId: string; content: SiteContent; expectedRevision: string; idempotencyKey: string }) {
    return this.call("publish", input.projectId, input, version);
  }
  async history(projectId: string) {
    return this.call("history", projectId, {}, z.array(version).max(100));
  }
  async current(projectId: string) {
    return this.call("current", projectId, {}, content);
  }
}
export function siteAdapter() {
  if (!process.env.SITE_ADAPTER_URL) return new BuiltinSiteAdapter();
  return new HttpSiteAdapter(process.env.SITE_ADAPTER_URL || "https://unconfigured.invalid", process.env.SITE_ADAPTER_SIGNING_KEY || "", process.env.SITE_ADAPTER_ALLOWED_ORIGIN || "");
}
