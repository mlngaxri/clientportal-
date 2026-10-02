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
      // PKCE callbacks must read the transient verifier even before a Fourthform session proof exists.
      const client = await db({ remember, expiry }, true);
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
        return NextResponse.redirect(new URL(returnPath, url.origin));
      }
    }
  } catch {
    /* Invalid/expired recovery or OAuth links return to a recoverable sign-in. */
  }
  return NextResponse.redirect(new URL("/start?error=signin", url.origin));
}
