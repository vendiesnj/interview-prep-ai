import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that are part of the authenticated app shell but exempt from
// the onboarding redirect (so we don't create an infinite loop).
const ONBOARDING_EXEMPT = new Set(["/onboarding", "/login", "/logout"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept app routes — skip API, static assets, auth callbacks
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/opengraph") ||
    pathname.startsWith("/twitter") ||
    ONBOARDING_EXEMPT.has(pathname)
  ) {
    return NextResponse.next();
  }

  // Only apply to authenticated app shell routes
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/sessions") ||
    pathname.startsWith("/results") ||
    pathname.startsWith("/mock-interview") ||
    pathname.startsWith("/public-speaking") ||
    pathname.startsWith("/networking") ||
    pathname.startsWith("/my-journey") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/archetypes") ||
    pathname.startsWith("/career-guide") ||
    pathname.startsWith("/job-profiles") ||
    pathname.startsWith("/question-bank");

  if (!isAppRoute) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not logged in — let (app)/layout.tsx handle the auth redirect
  if (!token) return NextResponse.next();

  // New user who hasn't completed onboarding → send to /onboarding
  if (token.onboardingComplete === false) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
