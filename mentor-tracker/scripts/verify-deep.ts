// Live verification harness for lib/github-deep.ts.
//
//   npx tsx scripts/verify-deep.ts <github-username>
//
// Runs each step of the deep profile against the real GitHub API and prints what
// came back, so the drill-down can be trusted without clicking through the UI.
// Steps that need GITHUB_TOKEN (GraphQL) are skipped with a clear notice when the
// token is absent; the REST steps (rank, stack scan) work either way, just under
// the 60 req/hr anonymous limit.

import {
  __internals,
  getDeepProfile,
  MissingTokenError,
  RANK_WINDOW,
} from "../lib/github-deep";

const { Budget, classify, fetchRank, fetchStack, fetchAllTimeTotals, lastPage } =
  __internals;

const user = process.argv[2] ?? "sindresorhus";
const repo = process.argv[3] ?? "vercel/next.js";
const hasToken = Boolean(process.env.GITHUB_TOKEN);

function hr(title: string) {
  console.log(`\n${"─".repeat(64)}\n${title}\n${"─".repeat(64)}`);
}

function bar(share: number, width = 20): string {
  const n = Math.round(share * width);
  return "█".repeat(n) + "░".repeat(width - n);
}

async function main() {
  console.log(
    `verify-deep · user=${user} · repo=${repo} · token=${hasToken ? "present" : "ABSENT"}`,
  );

  // ---- 1. Pure unit checks (no network) ----
  hr("1. classify() — extension → language, with noise filtering");
  const samples = [
    "src/app/page.tsx",
    "lib/github.ts",
    "main.py",
    "cmd/server/main.go",
    "crates/turbopack/src/lib.rs",
    "styles/app.scss",
    "README.md",
    "Dockerfile",
    "Makefile",
    "package-lock.json", // noise
    "node_modules/foo/index.js", // noise
    "dist/bundle.min.js", // noise
    "assets/logo.svg", // noise
    "Cargo.lock", // noise
    "api/schema.pb.go", // noise
    "weird.qqq", // unknown → Other
    "LICENSE", // extensionless, unknown
  ];
  let noiseOk = 0;
  for (const s of samples) {
    const c = classify(s);
    const expectNoise =
      s.includes("node_modules") ||
      s.includes("dist/") ||
      s.endsWith("lock.json") ||
      s.endsWith(".svg") ||
      s === "Cargo.lock" ||
      s.endsWith(".pb.go");
    if (expectNoise && c === null) noiseOk += 1;
    console.log(
      `  ${c === null ? "skip  " : "keep  "} ${s.padEnd(38)} ${c ? `${c.label} (${c.ext})` : "—"}`,
    );
  }
  console.log(`  → noise correctly dropped: ${noiseOk}/6`);

  hr("2. lastPage() — Link header parsing (drives contributor totals)");
  const link =
    '<https://api.github.com/repositories/70107786/contributors?per_page=5&page=2>; rel="next", <https://api.github.com/repositories/70107786/contributors?per_page=5&page=85>; rel="last"';
  console.log(`  rel="last" → ${lastPage(link)} (expect 85)`);
  console.log(`  no header  → ${lastPage(null)} (expect null)`);

  // ---- 3. Contributor rank (REST, works unauthenticated) ----
  hr(`3. fetchRank() — live: is "${user}" ranked in ${repo}?`);
  const budget = new Budget();
  try {
    const r = await fetchRank(repo, user, budget);
    console.log(`  rank              : ${r.rank ?? "—"}`);
    console.log(`  rankStatus        : ${r.rankStatus}`);
    console.log(`  commits (all-time): ${r.commits}`);
    console.log(
      `  contributors      : ${r.totalContributors ?? "?"} ${r.contributorsExact ? "(exact)" : "(lower bound)"}`,
    );
    if (r.rank && r.totalContributors) {
      const pct = Math.max(1, Math.round((r.rank / r.totalContributors) * 100));
      console.log(`  → renders as "#${r.rank} of ${r.totalContributors} · top ${pct}%"`);
    }
    console.log(`  rest budget left  : ${budget.rest}`);
  } catch (e) {
    console.log(`  FAILED: ${(e as Error).message}`);
  }

  // ---- 4. All-time totals (REST search) ----
  hr("4. fetchAllTimeTotals() — live search counts");
  try {
    const t = await fetchAllTimeTotals(user, budget);
    console.log(`  total PRs   : ${t.totalPRs}`);
    console.log(`  merged PRs  : ${t.totalMergedPRs}`);
    console.log(`  total issues: ${t.totalIssues}`);
    const rate = t.totalPRs ? Math.round((t.totalMergedPRs / t.totalPRs) * 100) : 0;
    console.log(`  merge rate  : ${rate}%`);
  } catch (e) {
    console.log(`  FAILED: ${(e as Error).message}`);
  }

  // ---- 5. Tech stack from real merged-PR files ----
  hr("5. fetchStack() — live: real files from merged PRs");
  if (!hasToken) {
    console.log(
      "  SKIPPED — needs ~21 requests; the 60/hr anonymous budget makes this\n" +
        "  unreliable. Set GITHUB_TOKEN to verify.",
    );
  } else {
    try {
      const s = await fetchStack(user, budget);
      if (!s) {
        console.log("  returned null (rate limited)");
      } else {
        console.log(
          `  scanned ${s.prsScanned} merged PRs → ${s.filesSeen} files (truncated=${s.truncated})`,
        );
        for (const e of s.entries.slice(0, 10)) {
          console.log(
            `    ${e.label.padEnd(20)} ${bar(e.share)} ${String(
              Math.round(e.share * 100),
            ).padStart(3)}%  (${e.files} files, +${e.additions}/-${e.deletions})`,
          );
        }
      }
    } catch (e) {
      console.log(`  FAILED: ${(e as Error).message}`);
    }
  }

  // ---- 6. Full profile (needs GraphQL → needs token) ----
  hr("6. getDeepProfile() — full end-to-end");
  try {
    const p = await getDeepProfile(user, { repoLimit: 8 });
    console.log(
      `  ${p.displayName ?? p.username} (@${p.username}) · ${p.followers} followers`,
    );
    console.log(
      `  contributed to ${p.reposContributedTo} public repos · showing ${p.repos.length}`,
    );
    console.log(
      `  last ${p.windowDays}d: ${p.commitsInWindow} commits, ${p.prsInWindow} PRs, ${p.issuesInWindow} issues, ${p.reviewsInWindow} reviews`,
    );
    console.log(
      `  all-time: ${p.totalPRs} PRs (${p.totalMergedPRs} merged), ${p.totalIssues} issues`,
    );
    console.log(`  partial=${p.partial}${p.note ? ` — ${p.note}` : ""}`);
    console.log("");
    console.log(
      `  ${"repo".padEnd(30)} ${"rank".padEnd(14)} ${"cm".padStart(5)} ${"iss".padStart(4)} ${"PR".padStart(4)} ${"mrg".padStart(4)} ${"cls".padStart(4)} ${"opn".padStart(4)} ${"rev".padStart(4)}`,
    );
    for (const r of p.repos) {
      const rank =
        r.rankStatus === "ranked"
          ? `#${r.rank}/${r.totalContributors ?? "?"}${r.contributorsExact ? "" : "+"}`
          : r.rankStatus === "outside-window"
            ? `>${RANK_WINDOW}`
            : r.rankStatus === "unranked"
              ? "no commits"
              : "unknown";
      console.log(
        `  ${r.nameWithOwner.slice(0, 30).padEnd(30)} ${rank.padEnd(14)} ${String(r.commits).padStart(5)} ${String(r.issuesOpened).padStart(4)} ${String(r.prsOpened).padStart(4)} ${String(r.prsMerged).padStart(4)} ${String(r.prsClosed).padStart(4)} ${String(r.prsOpen).padStart(4)} ${String(r.reviews).padStart(4)}`,
      );
    }
    if (p.stack?.entries.length) {
      console.log("\n  stack (real PR files):");
      for (const e of p.stack.entries.slice(0, 8)) {
        console.log(
          `    ${e.label.padEnd(20)} ${bar(e.share)} ${String(Math.round(e.share * 100)).padStart(3)}%`,
        );
      }
    }
  } catch (e) {
    if (e instanceof MissingTokenError) {
      console.log(`  SKIPPED — ${e.message}`);
    } else {
      console.log(`  FAILED: ${(e as Error).message}`);
    }
  }

  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
