import "next-auth";
import "next-auth/jwt";
import type { Role } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
      /**
       * Authorization role, derived from ALLOWED_LOGINS. Since any GitHub account
       * can now sign in, a session's existence proves nothing — this is what
       * gates /admin. Treat a missing value as "member".
       */
      role?: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    login?: string;
    role?: Role;
  }
}
