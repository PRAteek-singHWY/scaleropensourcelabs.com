// Server-only helper: resolve the current lead from the session, or null.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
