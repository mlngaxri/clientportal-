import { rateLimit } from "../../../lib/security/abuse";
import { requestSubject } from "../../../lib/security/limits";
import { cookies } from "next/headers";
import { z } from "zod";
import { db, checkOrigin, failure } from "../../../lib/server";
import { safeReturnPath } from "../../../lib/navigation";
import {
  sessionCookieOptions,
  sessionExpiry,
  signSessionExpiry,
} from "../../../lib/auth-session";
const input = z.object({
  mode: z.enum(["signup", "signin", "google", "logout"]),
  email: z.string().trim().email().max(254).optional(),
  password: z.string().min(8).max(128).optional(),
  remember: z.boolean().default(false),
  next: z.string().max(2048).optional(),
});
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = input.parse(await req.json());
    if (body.mode !== "logout")
      await rateLimit("auth", requestSubject(req), 12, 60);
    const jar = await cookies();
    const expiry = sessionExpiry(body.remember);
    const options = sessionCookieOptions(body.remember, expiry);
    const client = await db(
      body.mode === "logout" ? undefined : { remember: body.remember, expiry },
    );
    if (body.mode === "logout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw new Error("Sign out could not complete. Try again.");
      jar.delete("ff-remember");
      jar.delete("ff-session-until");
      return Response.json({ ok: true });
    }
    const next = safeReturnPath(body.next);
    if (body.mode === "google") {
      const redirect = new URL(
        "/auth/callback",
        process.env.APP_URL || new URL(req.url).origin,
      );
      redirect.searchParams.set("next", next);
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect.toString() },
      });
      if (error || !data.url)
        throw new Error(
          "Google sign-in is temporarily unavailable. Try again.",
        );
      jar.set("ff-remember", body.remember ? "yes" : "no", options);
      return Response.json({ url: data.url });
    }
    if (!body.email || !body.password)
      throw new Error("Enter your email and password.");
    const { data, error } =
      body.mode === "signup"
        ? await client.auth.signUp({
            email: body.email,
            password: body.password,
            options: {
              emailRedirectTo: `${process.env.APP_URL || new URL(req.url).origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          })
        : await client.auth.signInWithPassword({
            email: body.email,
            password: body.password,
          });
    if (error)
      throw new Error(
        body.mode === "signin"
          ? "Sign-in failed. Check your email and password, then try again."
          : "Account creation could not complete. Try again or sign in to your existing account.",
      );
    jar.set("ff-remember", body.remember ? "yes" : "no", options);
    if (!data.session)
      return Response.json({ ok: true, confirmationRequired: true });
    jar.set("ff-session-until", await signSessionExpiry(expiry), options);
    return Response.json({ ok: true, url: next });
  } catch (e) {
    return failure(e);
  }
}
