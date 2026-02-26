import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login
     * - /api/auth/* (Better Auth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /sitemap.xml, /robots.txt (static files)
     */
    "/((?!login|api/auth|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
