import { cookies } from "next/headers";
import { verifiedRecoveryExpiry } from "../../../lib/auth-session";
import { rateLimit } from "../../../lib/security/abuse";
import { requestSubject } from "../../../lib/security/limits";
import { checkOrigin, db, userDb, failure } from "../../../lib/server";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await rateLimit("account", requestSubject(req), 6, 60);
    const { action, email, password } = await req.json();
    if (action === "recovery") {
      if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      const client = await db();
      const callback = new URL("/auth/callback", process.env.APP_URL || new URL(req.url).origin);
      callback.searchParams.set("next", "/account/password");
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
      if (error) throw new Error("Recovery is temporarily unavailable. Try again later.");
      return Response.json({ ok: true });
    }
    if (action !== "password" || typeof password !== "string" || password.length < 8 || password.length > 128) throw new Error("Use a password between 8 and 128 characters.");
    const jar = await cookies();
    if (!(await verifiedRecoveryExpiry(jar.get("ff-recovery-until")?.value))) throw new Error("This password recovery link has expired. Request a new one.");
    const { client } = await userDb();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error("Use a password that meets the account requirements, then try again.");
    jar.delete("ff-recovery-until");
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
