import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sessionExpired, sessionCookieOptions } from "./lib/auth-session";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return response;
  const expired = sessionExpired(request.cookies.get("ff-session-until")?.value);
  if (expired) {
    for (const c of request.cookies.getAll()) if (c.name.startsWith("sb-") || c.name === "ff-session-until" || c.name === "ff-remember") { request.cookies.delete(c.name); response.cookies.delete(c.name); }
    return response;
  }
  const remember = request.cookies.get("ff-remember")?.value === "yes";
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...sessionCookieOptions(remember, request.cookies.get("ff-session-until")?.value),
              ...(value ? {} : { maxAge: 0 }),
            }),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/projects/:path*",
    "/api/:path*",
    "/auth/:path*",
    "/account/:path*",
    "/start",
    "/portal",
    "/app",
  ],
};
