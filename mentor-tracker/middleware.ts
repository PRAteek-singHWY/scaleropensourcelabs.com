// Protect every route by default. Unauthenticated requests are redirected to
// our custom /login page. Only the auth endpoints, the login page, and Next.js
// internals are public.
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
