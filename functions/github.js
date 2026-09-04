// Ask GitHub what one handle has contributed, and reduce the answer to the six values
// the dashboard shows.
//
// SEPARATE FROM index.js SO IT CAN BE TESTED WITHOUT FIREBASE. Everything here is a pure
// function of a fetch response, so test-github.mjs drives it with recorded payloads and
// no emulator, no credentials and no network. The same split as format.js.
//
// THE SEARCH API, NOT THE EVENTS API, and this is the decision the whole file rests on:
//
//   /users/{handle}/events  is the obvious endpoint and is useless here. It returns the
//                           last 90 days AND at most 300 events, so a member who
//                           contributed steadily for two years would show a partial
//                           quarter. It is an activity feed, not a history.
//   /search/issues          answers "every PR this account has ever opened, filtered by
//                           state" in one request, with a total count that does not lie
//                           about the tail. That is exactly the question.
//
// WHAT IT COSTS, AND WHICH LIMIT IT COSTS AGAINST. GitHub meters search separately from
// everything else, and this file touches both meters:
//
//   /search/issues   TWO requests per member (merged, then open), against the SEARCH
//                    limit — 10 per minute unauthenticated, 30 with a token. This is the
//                    binding constraint, and the throttle in index.js is sized against it.
//   /users/{handle}  ONE request per member, against the CORE limit — 60 per hour
//                    unauthenticated, 5,000 with a token. Effectively free with a token
//                    and the first thing to break without one.
//
// So a token is not optional past about fifteen members, and the failure without one
// arrives as a 403 that reads like a permissions problem.
//
// `is:merged` RATHER THAN `is:closed`. A closed PR is one that was rejected or abandoned
// just as often as one that landed, and counting those as contributions would make the
// number flattering and worthless. Open ones are counted separately and labelled as
// what they are: in flight.

/** How many recent pull requests to store per member. The dashboard shows a list, not an
 *  archive — and every stored row is a row in a document that is read on every dashboard
 *  load, so this is a page-weight decision as much as a design one. */
const RECENT = 8;

/** Firestore's hard limit is 1MB per document; this is nowhere near it, but a title is
 *  attacker-influenced in the sense that anybody can open a PR with a 2000-character
 *  title on a public repo. Truncated so a single hostile title cannot bloat the row. */
const MAX_TITLE = 160;

/** GitHub's largest allowed page size on the search API. Asked for on the merged search
 *  so the distinct-repository count is derived from a full page rather than from the
 *  handful of rows the dashboard lists — see fetchContributions. */
const PAGE_MAX = 100;

/** GitHub handles: alphanumerics and single hyphens, 1-39 characters, no leading or
 *  trailing hyphen. Validated BEFORE it goes anywhere near a URL.
 *
 *  This is the one piece of member-supplied text this function puts into a request, and
 *  it arrives from a free-text field on the profile. Encoding it would be enough to make
 *  it safe; rejecting it outright is better, because a handle that cannot be valid can
 *  never be found and the request is wasted. */
const HANDLE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function isValidHandle(h) {
  return typeof h === "string" && HANDLE.test(h.trim());
}

/** "https://github.com/owner/name/pull/12" -> "owner/name".
 *
 *  Derived from repository_url rather than from html_url: the former is a stable API
 *  field ("https://api.github.com/repos/owner/name"), the latter is a web URL whose shape
 *  GitHub is free to change. */
function repoOf(item) {
  const u = item?.repository_url ?? "";
  const m = u.match(/\/repos\/([^/]+\/[^/]+)$/);
  return m ? m[1] : "unknown";
}

function toPull(item, state) {
  const title = String(item?.title ?? "").slice(0, MAX_TITLE);
  const pull = {
    title: title || "(no title)",
    repo: repoOf(item),
    url: String(item?.html_url ?? ""),
    state,
  };
  // Omitted rather than written null when absent, so the stored shape matches the
  // optional field in web/lib/contributions.ts.
  if (item?.pull_request?.merged_at) pull.merged_at = item.pull_request.merged_at;
  else if (item?.closed_at && state === "merged") pull.merged_at = item.closed_at;
  return pull;
}

/** One search request. Returns { total, items } or throws.
 *
 *  `fetch` is global on Node 18+, which is what functions/package.json pins via
 *  engines.node — so there is no HTTP dependency in this file at all.
 *
 *  A User-Agent is REQUIRED by GitHub: without one the API returns 403 with a message
 *  about it, which reads like a rate limit and is not one. */
async function search(q, token, perPage) {
  const url =
    "https://api.github.com/search/issues" +
    `?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${perPage}`;

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "scaler-open-source-club",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  if (res.status === 403 || res.status === 429) {
    // Distinguished from a generic failure because the caller throttles on it. GitHub
    // uses 403 for rate limiting on the search API, which is why this is not simply
    // "not authorised".
    const err = new Error("GitHub rate limit");
    err.code = "rate-limit";
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GitHub returned ${res.status}`);
    err.code = "github-down";
    throw err;
  }

  const body = await res.json();
  return { total: Number(body?.total_count ?? 0), items: body?.items ?? [] };
}

/** Does this account exist? Asked separately so "no such handle" is distinguishable from
 *  "this person has no pull requests" — which look identical through the search API, and
 *  which the dashboard has to word completely differently. */
async function exists(handle, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "scaler-open-source-club",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, {
    headers,
  });
  if (res.status === 404) return false;
  if (res.status === 403 || res.status === 429) {
    const err = new Error("GitHub rate limit");
    err.code = "rate-limit";
    throw err;
  }
  // Anything else that is not a clean 200 is treated as "exists", so a transient blip on
  // this cheap check never wipes a member's real numbers with a not_found flag.
  return true;
}

/**
 * Everything the dashboard shows for one handle.
 *
 * Returns the exact shape stored at contributions/{uid}, minus uid and synced_at, which
 * the caller adds. Throws with `code` set to 'rate-limit' or 'github-down'; a handle that
 * does not exist is NOT a throw, because it is a normal answer the UI renders.
 */
async function fetchContributions(handle, token) {
  const h = String(handle ?? "").trim();
  if (!isValidHandle(h)) {
    const err = new Error("Not a possible GitHub handle");
    err.code = "bad-handle";
    throw err;
  }

  if (!(await exists(h, token))) {
    return { github: h, merged: 0, open: 0, repos: 0, recent: [], not_found: true };
  }

  // Two requests, merged first. If the second is rate-limited the first is still thrown
  // away — a row with real merged counts and a zeroed `open` would be a lie that looks
  // like data, and the caller's retry is cheap.
  //
  // PAGE_MAX ON THE MERGED SEARCH, NOT RECENT, AND THAT IS NOT A TYPO. The list only
  // shows RECENT rows, so asking for eight would seem to be enough — but `repos` is
  // counted from the items in this response, and eight items can name at most eight
  // repositories. Sized down to RECENT, a member with thirty merged PRs across twelve
  // projects would read "8 projects touched" forever, and the number would look like a
  // fact rather than a truncation. One page of 100 costs exactly the same one request.
  const merged = await search(`type:pr is:merged author:${h}`, token, PAGE_MAX);
  const open = await search(`type:pr is:open author:${h}`, token, 1);

  const all = merged.items.map((i) => toPull(i, "merged"));

  return {
    github: h,
    merged: merged.total,
    open: open.total,
    // Distinct repositories among the merged PRs this request returned. GitHub's search
    // API has no distinct-repository count, so this is derived — and it is therefore
    // EXACT up to PAGE_MAX merged pull requests and an undercount past it. A second page
    // would be a second request against a 30-per-minute limit, for a member who has
    // merged more than a hundred patches and does not need this dashboard to tell them
    // they are active. If the club ever has such members, paginate here rather than
    // quietly leaving the number wrong.
    repos: new Set(all.map((p) => p.repo)).size,
    recent: all.slice(0, RECENT),
  };
}

module.exports = {
  fetchContributions,
  isValidHandle,
  repoOf,
  toPull,
  RECENT,
  MAX_TITLE,
  PAGE_MAX,
};
