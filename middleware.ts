import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isAuthSessionCookie,
  verifiedSessionExpiry,
  sessionCookieOptions,
} from "./lib/auth-session";
function canonicalHost(host: string) {
  const hosts = [
    process.env.APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    "fourthform-client-portal.vercel.app",
  ];
  if (
    process.env.APP_ENV === "development" ||
    process.env.NODE_ENV !== "production"
  )
    hosts.push("localhost", "127.0.0.1");
  return hosts.some((value) => {
    if (!value) return false;
    try {
      return (
        new URL(value.includes("://") ? value : `https://${value}`).hostname ===
        host
      );
    } catch {
      return false;
    }
  });
}
async function availableSite(project: string, path: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return false;
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/public_site_available`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pid: project, page_path: path }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    return r.ok && (await r.json()) === true;
  } catch {
    return false;
  }
}
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const host = (request.headers.get("host") || request.nextUrl.host)
    .split(":")[0]
    .toLowerCase();
  // A probe is independently signed and must work before the first domain binding.
  if (path === "/api/site-health") return NextResponse.next();
  if (!canonicalHost(host)) {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
      return new NextResponse("Website unavailable.", { status: 404 });
    let project: string | null = null;
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/resolve_public_domain`,
        {
          method: "POST",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ host }),
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );
      if (r.ok) project = await r.json();
    } catch {}
    if (!project)
      return new NextResponse("Website unavailable.", { status: 404 });
    if (path.startsWith("/_next/static/") || path === "/site-analytics.js")
      return NextResponse.next();
    if (path.startsWith("/api/")) {
      if (
        path === `/api/collect/${project}` ||
        path === `/api/forms/${project}` ||
        (path.startsWith("/api/public-assets/") &&
          request.nextUrl.searchParams.get("project") === project)
      )
        return NextResponse.next();
      return new NextResponse("Page not found.", { status: 404 });
    }
    if (
      path.startsWith("/_next/") ||
      path.startsWith("/review/") ||
      path.startsWith("/sites/")
    )
      return new NextResponse("Page not found.", { status: 404 });
    if (!(await availableSite(project, path)))
      return new NextResponse("Page not found.", { status: 404 });
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = `/sites/${project}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(rewritten);
  }
  if (path.startsWith("/sites/")) {
    const match = path.match(/^\/sites\/([0-9a-f-]{36})(\/.*)?$/i);
    if (!match || !(await availableSite(match[1], match[2] || "/")))
      return new NextResponse("Page not found.", { status: 404 });
    return NextResponse.next();
  }
  if (
    /^\/api\/(forms|collect|public-assets)\//.test(path) ||
    path.startsWith("/_next/") ||
    /\.(js|css|svg|woff2|webp|png|jpg|ico)$/.test(path)
  )
    return NextResponse.next();
  let response = NextResponse.next({ request });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return response;
  const expiry = await verifiedSessionExpiry(
    request.cookies.get("ff-session-until")?.value,
  );
  if (!expiry) {
    for (const c of request.cookies.getAll())
      if (
        isAuthSessionCookie(c.name) ||
        c.name === "ff-session-until" ||
        c.name === "ff-remember"
      ) {
        request.cookies.delete(c.name);
        response.cookies.delete(c.name);
      }
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
              ...sessionCookieOptions(remember, expiry),
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
  matcher: ["/:path*"],
};
