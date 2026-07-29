import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runRefresh } from "@/lib/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Refreshing 5 members is ~250-350 GitHub requests and can take a couple of
// minutes. Lambda and most platforms default lower than this job needs.
export const maxDuration = 300;

// POST /api/cron/refresh?batch=5
//
// Refreshes the oldest published members whose cached contribution data is missing
// or past its TTL. Intended to run every 15 minutes; see lib/refresh.ts for why the
// batch is small.
//
// Auth is a shared secret, failing closed — see lib/cron-auth.ts. POST rather than
// GET because this mutates state and costs real API budget, so it should not be
// triggerable by anything that prefetches links.
//
//   AWS EventBridge Scheduler → HTTP target:
//     POST https://scaleropensourcelabs.com/api/cron/refresh
//     Header: x-cron-secret: <CRON_SECRET>
//     Schedule: rate(15 minutes)
export async function POST(req: Request) {
  const auth = authorizeCron(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const batchParam = Number(new URL(req.url).searchParams.get("batch"));
  const batchSize = Number.isFinite(batchParam) && batchParam > 0 ? batchParam : undefined;

  try {
    const report = await runRefresh({ batchSize });

    // Log a one-line summary: on a scheduled job nobody is watching the response,
    // so the logs are the only place this is observable.
    console.log(
      `[cron/refresh] due=${report.due} attempted=${report.attempted} ` +
        `refreshed=${report.refreshed} failed=${report.failed} remaining=${report.remaining}`,
    );
    for (const r of report.results) {
      if (r.status === "failed") {
        console.error(`[cron/refresh] ${r.github}: ${r.error}`);
      }
    }

    return NextResponse.json(report, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    console.error("[cron/refresh] aborted:", message);
    // 500 so the scheduler records a failure and retries on its own policy.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
