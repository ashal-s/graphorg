import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanics, new file
 * and export name). This is the "optimistic check" layer the Next.js auth
 * guide recommends: it only reads the already-verified JWT off the request
 * (no database call), and exists to redirect page navigation before a
 * protected page starts rendering. It deliberately excludes /api (see the
 * matcher below) — Route Handlers verify their own session, since a JSON API
 * should return 401/403, not an HTML redirect.
 */
const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = Boolean(req.auth);
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
