// Demo mode: run the whole app with no Postgres, no GitHub OAuth app, no personal
// access token and no allowlist, so that a first-time contributor can go from
// `git clone` to a working dashboard with `npm install && npm run dev`.
//
// In demo mode:
//   * mentors/mentees live in an in-memory store (lib/demo-store.ts) — they reset
//     when the dev server restarts, which is fine for a demo and stated in the UI
//   * GitHub data comes from deterministic fixtures (lib/demo-data.ts) instead of
//     the real API, so nobody burns a rate limit and the data is stable
//   * sign-in is a single button backed by a NextAuth Credentials provider that
//     accepts anyone — there is NO authentication
//
// That last point is why activation is deliberately conservative. A misconfigured
// production deploy (say, a missing DATABASE_URL) must never silently turn into a
// publicly writable app with authentication disabled.

/** The fixed identity every demo sign-in produces. */
export const DEMO_USER = {
  id: "demo-lead",
  name: "Demo Lead",
  login: "demo-lead",
  email: "demo@example.invalid",
  image: "https://github.com/github.png",
} as const;

/**
 * Whether demo mode is active.
 *
 *   DEMO_MODE=1                      → on, in any environment (shows a banner)
 *   production, no explicit flag     → OFF, always. Never inferred.
 *   development, no DATABASE_URL     → on. This is the zero-config path.
 *   development, DATABASE_URL set    → off; you asked for a real database.
 *
 * The production case is the important one: inferring demo mode from a missing
 * DATABASE_URL would mean a deploy that lost its database env var comes back up
 * as an open, unauthenticated app instead of failing loudly.
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  return !process.env.DATABASE_URL;
}

/** True when demo mode is on in a production build — always worth shouting about. */
export function isDemoModeInProduction(): boolean {
  return isDemoMode() && process.env.NODE_ENV === "production";
}

/**
 * NextAuth refuses to start without a secret. In demo mode there is nothing worth
 * protecting and we want zero required configuration, so a fixed development-only
 * value is used. It is intentionally self-describing: if this string ever shows up
 * in a real deployment's cookies, the deployment is misconfigured.
 */
const DEMO_SECRET = "demo-mode-insecure-secret-do-not-use-in-production";

export function authSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET ?? (isDemoMode() ? DEMO_SECRET : undefined);
}

/**
 * One-time startup notice, so nobody is confused about why their dashboard is
 * already populated or why sign-in didn't ask for anything.
 */
let announced = false;
export function announceDemoMode(): void {
  if (announced || !isDemoMode()) return;
  announced = true;
  const lines = [
    "",
    "  ┌───────────────────────────────────────────────────────────────┐",
    "  │  DEMO MODE — no database, no GitHub token, no authentication.  │",
    "  │                                                               │",
    "  │  Data is in-memory and resets on restart. GitHub numbers are   │",
    "  │  fixtures, not real. Anyone can sign in.                       │",
    "  │                                                               │",
    "  │  For the real thing, set DATABASE_URL and the GitHub vars —    │",
    "  │  see CONTRIBUTING.md.                                          │",
    "  └───────────────────────────────────────────────────────────────┘",
    "",
  ];
  console.warn(lines.join("\n"));
  if (isDemoModeInProduction()) {
    console.warn(
      "  !! DEMO_MODE=1 is set in a PRODUCTION build. Authentication is disabled\n" +
        "  !! and anyone can sign in. Unset DEMO_MODE unless this is a public demo.\n",
    );
  }
}
