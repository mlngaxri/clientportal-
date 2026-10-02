import { rateLimit } from "../../../lib/security/abuse";
import { requestSubject } from "../../../lib/security/limits";
import { cookies } from "next/headers";
import { authInput } from "../../../lib/auth-input";
import { db, checkOrigin, failure } from "../../../lib/server";
import { safeReturnPath } from "../../../lib/navigation";
import {
  sessionCookieOptions,
  sessionExpiry,
  signSessionExpiry,
} from "../../../lib/auth-session";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = authInput.parse(await req.json());
    if (body.mode !== "logout")
      await rateLimit("auth", requestSubject(req), 12, 60);
    const jar = await cookies();
    const expiry = sessionExpiry("remember" in body && body.remember);
    const options = sessionCookieOptions("remember" in body && body.remember, expiry);
    const client = await db(
      body.mode === "logout" ? undefined : { remember: ("remember" in body && body.remember), expiry },
    );
    if (body.mode === "logout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw new Error("Sign out could not complete. Try again.");
      jar.delete("ff-remember");
      jar.delete("ff-session-until");
      return Response.json({ ok: true });
    }
    const next = safeReturnPath("next" in body ? body.next : undefined);
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
      jar.set("ff-remember", ("remember" in body && body.remember) ? "yes" : "no", options);
      return Response.json({ url: data.url });
    }
    if (body.mode === "confirmation") {
      const redirect = new URL("/auth/callback", process.env.APP_URL || new URL(req.url).origin);
      redirect.searchParams.set("next", next);
      const { error } = await client.auth.resend({ type: "signup", email: body.email, options: { emailRedirectTo: redirect.toString() } });
      if (error) throw new Error("Account creation confirmation could not be resent. Wait a moment and try again.");
      return Response.json({ ok: true, confirmationRequired: true });
    }
    if (!body.email || !body.password)
      throw new Error("Enter your email and password.");
    const emailRedirect = new URL(
      "/auth/callback",
      process.env.APP_URL || new URL(req.url).origin,
    );
    emailRedirect.searchParams.set("next", next);
    const { data, error } =
      body.mode === "signup"
        ? await client.auth.signUp({
            email: body.email,
            password: body.password,
            options: {
              emailRedirectTo: emailRedirect.toString(),
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
    jar.set("ff-remember", ("remember" in body && body.remember) ? "yes" : "no", options);
    if (!data.session)
      return Response.json({ ok: true, confirmationRequired: true });
    jar.set("ff-session-until", await signSessionExpiry(expiry), options);
    return Response.json({ ok: true, url: next });
  } catch (e) {
    return failure(e);
  }
}
