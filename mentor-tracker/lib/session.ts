// Server-only session helpers.
//
// Since any GitHub account can now sign in (see lib/auth.ts), "has a session" is
// no longer an authorization check. Route handlers must ask for what they need:
//
//   currentUser()    → a signed-in user of ANY role. Use for member-owned data.
//   requireAdmin()   → an admin, or null. Use for anything under /admin.
//
// requireAdmin() is the one that matters. Every handler touching mentors, mentees
// or their email addresses must go through it, because middleware alone is not a
// sufficient boundary — a matcher typo would silently expose those routes.

import { getServerSession } from "next-auth";
import { authOptions, type Role } from "@/lib/auth";

export type SessionUser = {
  id: string;
  login: string | null;
  role: Role;
  name: string | null;
  image: string | null;
};

export async function currentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const u = session?.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    login: u.login ?? null,
    role: u.role ?? "member",
    name: u.name ?? null,
    image: u.image ?? null,
  };
}

/** Any signed-in user, regardless of role. Not an authorization check. */
export async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

/**
 * The current user if and only if they are an admin, else null. Fails closed: a
 * session with no role claim is treated as a member, never as an admin.
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await currentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Convenience for admin route handlers that only need the owning id. */
export async function requireAdminId(): Promise<string | null> {
  return (await requireAdmin())?.id ?? null;
}
