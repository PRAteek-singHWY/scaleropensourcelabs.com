// Route protection.
//
// This inverts the site's original posture. It used to protect EVERYTHING, which
// was correct when the app was a private dashboard. The site is now public at the
// root — landing page, leaderboard, member profiles — with the dashboard private
// under /admin.
//
//   public       /, /leaderboard, /members/*, /login
//   signed in    /join (needs a session so consent is tied to a real account)
//   admin only   /admin/*, and the mentor/mentee APIs
//
// Two things worth stating plainly:
//
// 1. Sign-in is no longer an authorization check. Any GitHub account can hold a
//    session, so members can consent to being published (see lib/auth.ts). This
//    matcher therefore checks the `role` claim, not merely that a token exists.
//
// 2. This is defence in depth, not the only defence. Every /admin page and admin
//    API route independently calls requireAdmin()/requireAdminId(). A mistake in
//    the matcher below must never be sufficient on its own to expose a mentee's
//    email address.

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req });

  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // Signed in but not an admin. Redirect home with a notice rather than to
  // /login, which they are already past and would look like a broken loop.
  if (token.role !== "admin") {
    return NextResponse.redirect(new URL("/?denied=admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only /admin/* and /join are gated. The mentor/mentee API routes enforce admin
  // inside their own handlers, so they are deliberately not listed here — a
  // narrow matcher means fewer places for a pattern mistake to matter.
  matcher: ["/admin/:path*"],
};
