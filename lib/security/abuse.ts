import "server-only";
import { admin } from "../server";
import { limitBucket, RequestLimitError } from "./limits";
export async function rateLimit(scope: string, subject: string, limit: number, window = 60) {
  // An instance-local map is deliberately not used: it fails across serverless instances.
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Account services are temporarily unavailable. Try again later.");
  const { data, error } = await admin().rpc("consume_request_limit", {
    p_bucket: limitBucket(scope, subject, secret), p_limit: limit, p_window: window,
  });
  if (error || !data || typeof data.allowed !== "boolean") {
    console.error(JSON.stringify({ event: "rate_limit_unavailable", scope, requestId: crypto.randomUUID() }));
    throw new Error("Account services are temporarily unavailable. Try again later.");
  }
  if (!data.allowed) throw new RequestLimitError(data.retryAfter);
}
