import { createHmac } from "node:crypto";

export class RequestLimitError extends Error {
  readonly status = 429;
  constructor(readonly retryAfter: number) {
    super("Too many requests. Wait a moment and try again.");
  }
}
export function limitBucket(scope: string, subject: string, secret: string) {
  return `${scope}:${createHmac("sha256", secret).update(subject).digest("hex")}`;
}
// Vercel overwrites x-forwarded-for. On other hosts, do not trust a client IP
// header: a deployment-wide bucket is conservative until a trusted proxy is set.
export function requestSubject(req: Request, vercel = process.env.VERCEL === "1") {
  return vercel ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown") : "deployment";
}
