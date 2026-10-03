import { cookies } from "next/headers";
import {
  sessionCookieOptions,
  sessionExpiry,
  signRecoveryExpiry,
  signSessionExpiry,
} from "../../../lib/auth-session";
import { NextResponse } from "next/server";
import { safeReturnPath } from "../../../lib/navigation";
import { db } from "../../../lib/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  try {
    if (code) {
      const jar = await cookies();
      const returnPath = safeReturnPath(url.searchParams.get("next"));
      const recovery = returnPath === "/account/password";
      const remember = !recovery && jar.get("ff-remember")?.value === "yes";
      const expiry = sessionExpiry(remember);
      // The PKCE verifier is not a Supabase session token, so it remains readable while stale auth tokens stay gated.
      const client = await db({ remember, expiry });
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        if (recovery) {
          jar.delete("ff-remember");
          jar.set("ff-recovery-until", await signRecoveryExpiry(expiry), sessionCookieOptions(false, expiry));
        }
        jar.set(
          "ff-session-until",
          await signSessionExpiry(expiry),
          sessionCookieOptions(remember, expiry),
        );
        // Record only the callback purpose; never emit the authorization code, tokens, account data or provider text.
        console.info(JSON.stringify({ event: "auth_callback_exchanged", recovery }));
        return NextResponse.redirect(new URL(returnPath, url.origin));
      }
      console.error(JSON.stringify({ event: "auth_callback_exchange_failed", code: error.code || "unknown" }));
    } else {
      console.error(JSON.stringify({ event: "auth_callback_missing_code" }));
    }
  } catch (error) {
    // Keep callback evidence diagnostic-only: provider messages can contain account or token details.
    console.error(JSON.stringify({
      event: "auth_callback_exception",
      category: error instanceof Error ? error.name : "unknown",
    }));
  }
  return NextResponse.redirect(new URL("/start?error=signin", url.origin));
}
