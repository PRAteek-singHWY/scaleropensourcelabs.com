// Server-only auth config. NextAuth (Auth.js) with GitHub OAuth, a Prisma/
// Postgres adapter, and a strict fail-closed allowlist.
//
// Security model:
//   - Only GitHub logins in ALLOWED_LOGINS may create a session. Empty list =
//     deny everyone (fail closed).
//   - Sessions are NextAuth JWTs: encrypted (JWE, A256GCM) with NEXTAUTH_SECRET
//     and stored in an httpOnly, secure, sameSite cookie. Devtools cannot read
//     the contents, and no user PII is placed in localStorage anywhere.
//   - The Prisma adapter persists User/Account rows in Postgres so each lead has
//     a stable id that owns their mentors/mentees (multi-tenant, scalable).

import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function allowedLogins(): string[] {
  return (process.env.ALLOWED_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
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
    // Gate: reject anyone whose GitHub login is not explicitly allowlisted.
    async signIn({ profile }) {
      const login = (profile as { login?: string } | undefined)?.login
        ?.toLowerCase()
        .trim();
      const allowed = allowedLogins();
      if (!login) return false;
      if (allowed.length === 0) return false; // fail closed
      return allowed.includes(login);
    },
    async jwt({ token, user, profile }) {
      if (user?.id) token.uid = user.id;
      const login = (profile as { login?: string } | undefined)?.login;
      if (login) {
        token.login = login;
        // Best-effort cache of the GitHub login for display.
        if (user?.id) {
          await prisma.user
            .update({ where: { id: user.id }, data: { login } })
            .catch(() => undefined);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.login = token.login;
      }
      return session;
    },
  },
};
