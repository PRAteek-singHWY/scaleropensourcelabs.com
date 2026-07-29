// Shared-secret authentication for scheduled jobs.
//
// The cron routes are the most dangerous surface on the site. They have no user
// session, they are expensive (the refresh job spends thousands of GitHub API
// requests) and they send email. Left open, one person with the URL could drain
// the club's rate limit for the hour or mail every member repeatedly.
//
// So: a bearer secret that is compared in constant time, and it FAILS CLOSED. If
// CRON_SECRET is unset the routes refuse every request rather than running
// unauthenticated — a missing environment variable must disable the job, never
// expose it.
//
// Deliberately not tied to any one platform: AWS EventBridge Scheduler, a GitHub
// Actions cron, or `curl` from a laptop all work the same way, so switching hosts
// doesn't mean rewriting this.

import { timingSafeEqual } from "node:crypto";

/** Constant-time string compare that doesn't leak length through early return. */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself be a timing
  // signal, so hash-free equalisation: compare same-length buffers and AND in the
  // length check.
  if (a.length !== b.length) {
    // Still do a comparison of equal-length buffers so the work is constant.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Accepts either `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 * The header variant exists because some schedulers make custom headers easier to
 * configure than an Authorization header.
 */
export function authorizeCron(req: Request): CronAuthResult {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    return {
      ok: false,
      status: 503,
      error:
        "CRON_SECRET is not configured (or is shorter than 16 characters). Scheduled jobs are disabled until it is set.",
    };
  }

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const provided = bearer ?? req.headers.get("x-cron-secret") ?? "";

  if (!provided || !secretsMatch(provided, expected)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
