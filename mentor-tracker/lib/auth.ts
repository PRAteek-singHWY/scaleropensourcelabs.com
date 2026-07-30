// Server-only auth config. NextAuth (Auth.js) with GitHub OAuth, a Prisma/
// Postgres adapter, and a two-role authorization model.
//
// Security model
// --------------
// The site has a PUBLIC zone (landing page, leaderboard) and a PRIVATE zone
// (/admin — mentors, mentees, and their email addresses). Two roles:
//
//   admin  — GitHub login is listed in ALLOWED_LOGINS. Full access to /admin.
//   member — any other GitHub account. May sign in, join the club, and manage
//            their OWN member profile. No access to /admin, ever.
//
// Why any GitHub account may now hold a session: the public leaderboard publishes
// students' names and stats, so consent has to come from the person being
// published, not from an admin. /join therefore requires a GitHub sign-in, which
// proves whoever consents controls the account being published. Consent granted
// by an admin on someone else's behalf would be worthless.
//
// This is the part to be careful about. Sign-in is NO LONGER the security
// boundary — ROLE is. Every /admin page and every admin API route must check the
// role, not merely that a session exists. See requireAdmin() in lib/session.ts.
// Authorization is enforced in middleware AND again in each route handler, so a
// mistake in the middleware matcher cannot expose data on its own.
//
//   - Sessions are NextAuth JWTs: encrypted (JWE, A256GCM) with NEXTAUTH_SECRET
//     and stored in an httpOnly, secure, sameSite cookie. Devtools cannot read
//     the contents, and no user PII is placed in localStorage anywhere.
//   - The Prisma adapter persists User/Account rows in Postgres so each admin has
//     a stable id that owns their mentors/mentees (multi-tenant, scalable).

import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authSecret, demoAdminLogin, DEMO_USER, isDemoMode } from "@/lib/demo";

export type Role = "admin" | "member";

function allowedLogins(): string[] {
  return (process.env.ALLOWED_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin iff the GitHub login is explicitly allowlisted. Fails closed: an empty or
 * unset ALLOWED_LOGINS grants admin to NOBODY, so losing that env var locks the
 * dashboard rather than opening it to everyone.
 */
export function roleForLogin(login: string | null | undefined): Role {
  const l = login?.toLowerCase().trim();
  if (!l) return "member";
  return allowedLogins().includes(l) ? "admin" : "member";
}

/**
 * Demo sign-in. Present ONLY in demo mode, which never activates implicitly in
 * production (see lib/demo.ts) — so this cannot appear on a real deployment
 * unless somebody explicitly sets DEMO_MODE=1, and even then the UI shouts about
 * it.
 *
 * It exists so the app can be demonstrated and developed without a GitHub OAuth
 * app: one button, no password, signing in as the seeded organiser so the seeded
 * mentors and mentees are actually owned by the session.
 *
 * There is NO authentication here. That is the point, and it is why the gate on
 * it is the strictest thing in the codebase.
 */
function demoProvider() {
  return CredentialsProvider({
    id: "demo",
    name: "Demo organiser",
    credentials: {},
    async authorize() {
      const login = demoAdminLogin();
      // Reuse the seeded lead (same email constant) so /admin shows the seeded
      // mentors and mentees rather than an empty dashboard owned by a new user.
      const user = await prisma.user.upsert({
        where: { email: DEMO_USER.email },
        create: { email: DEMO_USER.email, name: DEMO_USER.name, login },
        update: { login },
        select: { id: true, name: true, email: true },
      });
      return { id: user.id, name: user.name, email: user.email, login };
    },
  });
}

export const authOptions: NextAuthOptions = {
  // The Prisma adapter and a credentials provider don't mix — the adapter has no
  // concept of a credentials session. JWT sessions (set below) make it work, so
  // the adapter is only attached when real OAuth is in play.
  ...(isDemoMode() ? {} : { adapter: PrismaAdapter(prisma) }),
  secret: authSecret(),
  providers: isDemoMode()
    ? [demoProvider()]
    : [
        GitHubProvider({
          clientId: process.env.GITHUB_OAUTH_ID ?? "",
          clientSecret: process.env.GITHUB_OAUTH_SECRET ?? "",
        }),
      ],
  // JWT sessions keep middleware (getToken) working and avoid a DB read on every
  // request; the token is encrypted, so it never exposes data to the client.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Any valid GitHub account may hold a session — see the note above. This is
    // NOT an authorization decision; authorization is the `role` claim below.
    async signIn({ account, profile }) {
      if (account?.provider === "demo") return isDemoMode();
      const login = (profile as { login?: string } | undefined)?.login;
      return Boolean(login);
    },

    async jwt({ token, user, profile }) {
      if (user?.id) token.uid = user.id;

      // OAuth carries the login on `profile`; the demo provider returns it on
      // `user`. Either way the login is what the role is derived from.
      const login =
        (profile as { login?: string } | undefined)?.login ??
        (user as { login?: string } | undefined)?.login;
      if (login) {
        token.login = login;
        // Best-effort cache of the GitHub login for display.
        if (user?.id) {
          await prisma.user
            .update({ where: { id: user.id }, data: { login } })
            .catch(() => undefined);
        }
      }

      // Recomputed from ALLOWED_LOGINS on every token refresh rather than frozen
      // at first sign-in, so revoking someone's admin takes effect without
      // waiting for their cookie to expire.
      token.role = roleForLogin(
        (token.login as string | undefined) ?? login ?? null,
      );
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.login = token.login;
        session.user.role = (token.role as Role | undefined) ?? "member";
      }
      return session;
    },
  },
};
