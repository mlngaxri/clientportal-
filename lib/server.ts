import { RequestLimitError } from "./security/limits";
import "server-only";
import {
  verifiedSessionExpiry,
  sessionCookieOptions,
  isAuthSessionCookie,
} from "./auth-session";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
export function configured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
export async function db(newSession?: { remember: boolean; expiry: string }) {
  if (!configured())
    throw new Error(
      "Account services are not configured yet. Your work has not been saved.",
    );
  const jar = await cookies();
  const sessionNow = Date.now();
  const expiry = await verifiedSessionExpiry(
    jar.get("ff-session-until")?.value,
    undefined,
    sessionNow,
  );
  const remember = jar.get("ff-remember")?.value === "yes";
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          !expiry
            ? jar.getAll().filter((c) => !isAuthSessionCookie(c.name))
            : jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, {
                ...options,
                ...sessionCookieOptions(
                  newSession?.remember ?? remember,
                  newSession?.expiry ?? expiry ?? undefined,
                  sessionNow,
                ),
                ...(value ? {} : { maxAge: 0 }),
              }),
            );
          } catch {
            /* Server Components cannot set cookies; middleware refreshes. */
          }
        },
      },
    },
  );
}
export function admin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Server integration is not configured.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}
export class AccessError extends Error {
  constructor(message: string, public status: 401 | 404 | 503) { super(message); }
}
export async function userDb() {
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error && !/session|JWT|refresh|token|not authenticated/i.test(error.message)) throw new AccessError("Account access is temporarily unavailable. Try again.", 503);
  if (!user) throw new AccessError("Please sign in to continue.", 401);
  return { client, user };
}
export async function ownedProject(id: string) {
  const { client, user } = await userDb();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw new AccessError("Your project is temporarily unavailable. Try again.", 503);
  if (!data) throw new AccessError("Project not found or access denied.", 404);
  return { client, user, project: data };
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new Error("Invalid request origin.");
}
export function failure(error: unknown) {
  const requestId = crypto.randomUUID();
  const raw = error instanceof Error ? error.message : "";
  const limited = error instanceof RequestLimitError;
  const validation = error instanceof Error && error.name === "ZodError";
  // Log categories only: provider text may contain SQL, email addresses or secrets.
  console.error(
    JSON.stringify({
      event: "request_failed",
      requestId,
      category: validation
        ? "validation"
        : error instanceof Error
          ? error.name
          : "unknown",
    }),
  );
  const known =
    /^(Please sign in|Project not found|Invalid request origin|Save conflict|This Direction is locked|Invalid Direction|Direction |Invalid project asset|Business |Initial Direction|Additional notes|Revisions |Revision |Only a draft revision|Work has begun|Pro is required|Live management|An additional revision|Add |Resolve or remove|Approval and payment|Launch |The current domain|Only Fourthform|Unknown action|Idempotency key|Enter |Use a password|Recovery is|Sign-in failed|Sign out could|Account creation|Google sign-in|Check your email|Account services|Server integration|Website |Your website|The website|This website|Domain |The domain|Hosting |Choose your|Invalid website|Invalid connection|Invalid State|Search inspection|Unknown website|Uploaded |Choose a document|Document uploads|Document scanning|Payment is being|This payment|Live payments|First applications|Pro billing)/.test(
      raw,
    );
  const message = limited
    ? raw
    : validation
      ? "Check the information you entered and try again."
      : known
        ? raw
        : "The request could not complete. Your work has not been confirmed saved. Try again.";
  return Response.json(
    { error: message, requestId },
    {
      status: limited
        ? 429
        : /temporarily unavailable|not configured/.test(raw)
          ? 503
          : /sign in to continue/i.test(raw)
            ? 401
            : /not found or access denied/i.test(raw)
              ? 404
              : /conflict|locked|not editable|not available|cannot be|Only a draft revision|Work has begun|onboarding is complete/i.test(
                    raw,
                  )
                ? 409
                : 400,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Request-ID": requestId,
        ...(limited ? { "Retry-After": String(error.retryAfter) } : {}),
      },
    },
  );
}
