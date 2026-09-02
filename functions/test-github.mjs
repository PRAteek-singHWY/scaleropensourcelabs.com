// Drive github.js against recorded GitHub payloads.
//
//   node test-github.mjs
//
// NO NETWORK, NO CREDENTIALS, NO EMULATOR — the same bargain as test-format.mjs. Every
// function under test is a pure function of a fetch response, so `fetch` is replaced with
// a stub that returns whatever the case needs. That is what lets this run in CI on a
// checkout with no Firebase project and no GitHub token.
//
// WHAT IS WORTH TESTING HERE, and it is not "does it call the right URL":
//
//   * the handle validator, because it is the one place member-supplied text reaches a
//     URL, and because its regex is easy to get subtly wrong (leading hyphens, doubled
//     hyphens, 40 characters);
//   * "no such account" versus "an account with no pull requests", because they arrive
//     from GitHub looking almost identical and the dashboard has to word them completely
//     differently;
//   * the distinct-repository count, because it is derived rather than returned, and the
//     bug it replaced — counting only the eight rows the dashboard lists — produced a
//     number that looked entirely plausible;
//   * that a rate limit THROWS with a code rather than resolving to zeroes, because a
//     silent zero would overwrite a real member's real counts with nothing.

import { fetchContributions, isValidHandle, repoOf, toPull } from "./github.js";

let pass = 0;
let fail = 0;

function ok(label, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? `  ${detail}` : ""}`);
  }
}

const eq = (label, actual, expected) =>
  ok(label, Object.is(actual, expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

/** A search result item, in the shape /search/issues actually returns. */
const item = (n, repo = "octo/hello") => ({
  title: `Fix the thing ${n}`,
  html_url: `https://github.com/${repo}/pull/${n}`,
  repository_url: `https://api.github.com/repos/${repo}`,
  pull_request: { merged_at: "2026-05-01T10:00:00Z" },
});

/** Replace global fetch with a router keyed on a substring of the URL. Restored by the
 *  caller; every case installs its own. */
function stubFetch(routes) {
  globalThis.fetch = async (url) => {
    for (const [needle, res] of routes) {
      if (String(url).includes(needle)) {
        return typeof res === "function" ? res() : res;
      }
    }
    throw new Error(`unstubbed fetch: ${url}`);
  };
}

const json = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const realFetch = globalThis.fetch;

console.log("\ngithub.js\n");

// ------------------------------------------------------------------ handles
console.log("-- handles --");
for (const good of ["a", "octocat", "Octo-Cat", "a1-b2-c3", "x".repeat(39)]) {
  ok(`"${good}" is a possible handle`, isValidHandle(good));
}
for (const bad of ["", "-lead", "trail-", "double--hyphen", "x".repeat(40), "has space", "has/slash", "under_score", null, 42]) {
  ok(`${JSON.stringify(bad)} is refused`, !isValidHandle(bad));
}

// ------------------------------------------------------------------ parsing
console.log("\n-- parsing one pull request --");
eq("repo comes from repository_url", repoOf(item(1, "torvalds/linux")), "torvalds/linux");
eq("an unparseable repository_url degrades", repoOf({ repository_url: "nonsense" }), "unknown");
eq("a missing title does not render as empty", toPull({}, "merged").title, "(no title)");
ok(
  "a hostile title is truncated",
  toPull({ title: "x".repeat(500) }, "merged").title.length === 160,
);
ok(
  "merged_at is omitted rather than null when absent",
  !("merged_at" in toPull({ title: "t" }, "open")),
);

// --------------------------------------------------------------- the fetch
console.log("\n-- a member with contributions --");
stubFetch([
  ["/users/", json({ login: "asha" })],
  [
    "is%3Amerged",
    json({
      total_count: 12,
      // Ten items across four distinct repositories. The list the dashboard shows is
      // capped at eight, so this is the case that catches a repo count derived from the
      // truncated list instead of the full page.
      items: [
        item(1, "a/one"), item(2, "a/one"), item(3, "b/two"), item(4, "b/two"),
        item(5, "c/three"), item(6, "c/three"), item(7, "a/one"), item(8, "a/one"),
        item(9, "d/four"), item(10, "d/four"),
      ],
    }),
  ],
  ["is%3Aopen", json({ total_count: 2, items: [] })],
]);
{
  const c = await fetchContributions("asha", "");
  eq("merged is the search total, not the page length", c.merged, 12);
  eq("open is counted separately", c.open, 2);
  eq("repos counts DISTINCT repositories across the whole page", c.repos, 4);
  eq("the stored list is capped at RECENT", c.recent.length, 8);
  eq("not_found is absent for a real account", c.not_found, undefined);
  eq("every stored row is labelled merged", c.recent.every((p) => p.state === "merged"), true);
}

console.log("\n-- a real account that has contributed nothing --");
stubFetch([
  ["/users/", json({ login: "newbie" })],
  ["is%3Amerged", json({ total_count: 0, items: [] })],
  ["is%3Aopen", json({ total_count: 0, items: [] })],
]);
{
  const c = await fetchContributions("newbie", "");
  eq("counts are zero", c.merged + c.open + c.repos, 0);
  // THE DISTINCTION THE UI DEPENDS ON. Zeroes with not_found absent means "nothing yet",
  // which the dashboard words encouragingly. Zeroes WITH not_found means "check your
  // handle for a typo". Collapsing them would tell a first-year they had made a mistake.
  eq("but not_found stays absent", c.not_found, undefined);
}

console.log("\n-- a handle that does not exist --");
stubFetch([["/users/", json({ message: "Not Found" }, 404)]]);
{
  const c = await fetchContributions("nosuchuser", "");
  eq("not_found is set", c.not_found, true);
  eq("and no search was attempted", c.recent.length, 0);
}

console.log("\n-- failures --");
stubFetch([["/users/", json({ message: "rate limit" }, 403)]]);
{
  let code = "";
  try {
    await fetchContributions("asha", "");
  } catch (e) {
    code = e.code;
  }
  // MUST THROW, NOT RESOLVE TO ZEROES. A silent zero here overwrites a member's real
  // counts with nothing, and the dashboard would show it as fact.
  eq("a rate limit throws with a code", code, "rate-limit");
}

stubFetch([["/users/", json({}, 500)]]);
{
  // 500 is deliberately NOT treated as "no such account" — see the comment in exists().
  // A transient GitHub blip must not flag a valid handle as a typo.
  stubFetch([
    ["/users/", json({}, 500)],
    ["is%3Amerged", json({ total_count: 1, items: [item(1)] })],
    ["is%3Aopen", json({ total_count: 0, items: [] })],
  ]);
  const c = await fetchContributions("asha", "");
  eq("a 500 on the user lookup does not flag a typo", c.not_found, undefined);
}

{
  let code = "";
  try {
    await fetchContributions("-not-a-handle-", "");
  } catch (e) {
    code = e.code;
  }
  eq("an impossible handle is refused before any request", code, "bad-handle");
}

globalThis.fetch = realFetch;

console.log(
  fail === 0
    ? `\n  ${pass} passed.\n`
    : `\n  ${pass} passed, ${fail} FAILED.\n`,
);
process.exit(fail === 0 ? 0 : 1);
