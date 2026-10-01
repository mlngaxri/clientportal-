import { cookies } from "next/headers";
import {
  sessionCookieOptions,
  signSessionExpiry,
  REMEMBER_SECONDS,
  SESSION_SECONDS,
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
      const remember = jar.get("ff-remember")?.value === "yes";
      const expiry = String(
        Date.now() + (remember ? REMEMBER_SECONDS : SESSION_SECONDS) * 1000,
      );
      const client = await db({ remember, expiry });
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        jar.set(
          "ff-session-until",
          await signSessionExpiry(expiry),
          sessionCookieOptions(remember, expiry),
        );
        return NextResponse.redirect(
          new URL(
            safeReturnPath(url.searchParams.get("next")),
            process.env.APP_URL || url.origin,
          ),
        );
      }
    }
  } catch {
    /* Invalid/expired recovery or OAuth links return to a recoverable sign-in. */
  }
  return NextResponse.redirect(
    new URL("/start?error=signin", process.env.APP_URL || url.origin),
  );
}
