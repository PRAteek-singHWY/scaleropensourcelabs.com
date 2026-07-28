# Mentor Tracker

A **private, multi-lead** dashboard for university/college mentorship programs.
A lead signs in with GitHub, enters mentors and their mentees (GitHub usernames
only), and gets a live view of each mentee's **public** GitHub activity — latest
issue raised, recent PRs with linked issues, commit streak, commits in the last 30
days, and active repos.

- **Lead login = GitHub OAuth, locked to an allowlist.** Only GitHub usernames you
  list in `ALLOWED_LOGINS` can ever create a session. Everyone else is rejected
  even after a valid GitHub login. If the allowlist is empty, **nobody** gets in
  (fail closed).
- **Mentees never log in.** Their public data is read via the GitHub REST v3 and
  GraphQL v4 APIs, public-only queries. No OAuth, no permissions, ever.
- **Full activity analytics per mentee** — commits (30-day bar chart + streak),
  pull requests (open / merged / closed with merge rate), issues (open / closed),
  community engagement (threads commented on), followers, stars, and active repos.
  Plus a **program overview**: aggregate totals across the cohort and a commits
  leaderboard. Charts are dependency-free inline SVG, validated for the dark surface.
- **Per-repo contribution drill-down + contributor rank** (`/mentee/:id`) — for
  every public repo a mentee contributes to, *including repos they don't own*:
  their **rank among that repo's contributors**, commits, issues opened/closed,
  PRs opened/merged/closed/open, review count and merge rate. Plus the **tech
  stack they actually write**, measured from the files changed in their merged
  PRs. See [Contribution drill-down](#contribution-drill-down) for what each
  number means and where it's approximate.
- **Hierarchy:** Lead → Mentors → Mentees (name, email, GitHub username).
- **Persistence = Postgres via Prisma.** Every mentor is owned by a lead; every
  mentee belongs to a mentor. Each lead sees only their own data (multi-tenant).
  No mentee PII (names, emails) ever touches the browser's storage or devtools —
  it is fetched per-request from authenticated, ownership-scoped API routes.
- **Secrets stay server-side:** the GitHub data token, the OAuth client secret,
  and the DB URL never reach the browser. NextAuth sessions are **encrypted** JWTs
  (JWE) in an httpOnly, secure, sameSite cookie — unreadable in devtools.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind + NextAuth +
Prisma/Postgres**. Dark theme with pink + blue accents.

## Security model

| Layer | What protects it |
| --- | --- |
| Every page + all `/api/*` (incl. data + GitHub) | `middleware.ts` — no valid session → 307 redirect to `/login` |
| Who may sign in | `signIn` callback in `lib/auth.ts` — GitHub login must be in `ALLOWED_LOGINS`, else denied |
| Misconfiguration | Empty allowlist = deny all (fail closed) |
| One lead reading another's data | Every DB query is scoped by `session.user.id`; deletes use `deleteMany({ where: { …, userId } })` so guessing another lead's id changes nothing (returns 404) |
| Session confidentiality | Encrypted JWT (JWE, `NEXTAUTH_SECRET`) in an httpOnly, secure, sameSite cookie — devtools cannot read its contents |
| Data at rest / in the client | Rows live in Postgres, never in `localStorage`; the browser only ever sees data for the mentors it owns |
| GitHub data token & OAuth secret | Read only on the server (`lib/github.ts`, `lib/auth.ts`); never sent to the client |

These map to the NextAuth (Auth.js) recommended patterns: OAuth provider +
adapter, encrypted session, server-side authorization checks in every route
handler, and least-privilege data access.

> Honest note: no app is literally "unhackable," but this is the standard,
> hardened pattern. Keep `NEXTAUTH_SECRET`, the OAuth secret, and `DATABASE_URL`
> private, and only add trusted usernames to `ALLOWED_LOGINS`.

## Verified behavior

The auth + data layer was exercised end-to-end against a real Postgres instance:

| Test | Result |
| --- | --- |
| Unauthenticated `GET /api/mentors` | 307 → `/login` (blocked) |
| Lead A creates mentor + mentee | 201, persisted to Postgres |
| Lead A lists own data | sees their 1 mentor / 1 mentee |
| Lead B lists data | sees **0** (tenant isolation) |
| Lead B deletes Lead A's mentor | 404, Lead A's data untouched (ownership) |
| Data location | rows in Postgres `Mentor`/`Mentee` tables; nothing in `localStorage` |

## Local development

**1. Create a GitHub OAuth App** (this is your login) at
[github.com/settings/developers](https://github.com/settings/developers) →
**New OAuth App**:

- Application name: `Mentor Tracker` (anything)
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

Copy the **Client ID** and generate a **Client Secret**.

**2. Get a Postgres database.** Any Postgres works — a local one, or a free
managed one from [Neon](https://neon.tech), [Supabase](https://supabase.com), or
Vercel Postgres. You need a connection string.

**3. Configure env:**

```bash
cd mentor-tracker
npm install                  # runs `prisma generate` automatically
cp .env.example .env.local
```

Fill in `.env.local`:

```
DATABASE_URL=postgresql://…  # pooled connection string
DIRECT_URL=postgresql://…    # direct connection (same as DATABASE_URL if no pooler)
GITHUB_TOKEN=                # PAT, no scopes. REQUIRED for the drill-down (GraphQL);
                             #   also lifts REST 60 → 5000 req/hr
GITHUB_OAUTH_ID=             # OAuth App Client ID
GITHUB_OAUTH_SECRET=         # OAuth App Client Secret
ALLOWED_LOGINS=you           # YOUR github username (comma-separate for more leads)
NEXTAUTH_SECRET=             # run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

> Prisma CLI reads `.env` (not `.env.local`). Either duplicate the two DB vars into
> a `.env`, or run the push command with them inline.

**4. Create the tables, then run:**

```bash
npm run db:push          # creates/updates the Postgres tables from prisma/schema.prisma
npm run dev              # http://localhost:3000  → redirects to /login
```

`npm run db:studio` opens Prisma Studio to inspect the data. GitHub data responses
are cached 5 minutes at the edge
(`Cache-Control: s-maxage=300, stale-while-revalidate=600`).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Create a **second** GitHub OAuth App (or edit the first) with the production URLs:
   - Homepage URL: `https://your-app.vercel.app`
   - Callback URL: `https://your-app.vercel.app/api/auth/callback/github`
3. Go to [vercel.com/new](https://vercel.com/new) → import the repo → accept defaults.
4. Project Settings → Environment Variables → add **all** of:
   - `DATABASE_URL`, `DIRECT_URL` — your managed Postgres connection strings
   - `GITHUB_TOKEN` — classic PAT with **no scopes** (public data is enough). Required for the contribution drill-down
   - `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET` — from the production OAuth App
   - `ALLOWED_LOGINS` — your GitHub username(s)
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://your-app.vercel.app`
5. Run `npm run db:push` once against your production DB (or add
   `prisma migrate deploy` to your build) to create the tables.
6. Deploy. The build runs `prisma generate` automatically; no code changes required.

## How it works

**Data (your mentors/mentees) — Postgres, auth-scoped:**
- `GET/POST /api/mentors`, `DELETE /api/mentors/:id`
- `POST /api/mentees`, `DELETE /api/mentees/:id`
- Every handler resolves the lead via `getServerSession` and scopes all queries
  to `session.user.id`. `lib/storage.ts` is the browser-side client for these.

**GitHub activity — public, cached:**
- `GET /api/mentee/:username` returns a `MenteeSnapshot` JSON (see `lib/github.ts`).
  - Invalid usernames → `400`.
  - Upstream GitHub errors are captured into `snapshot.error` and still return
    `200`, so one bad mentee never breaks the rest of the grid.
- `components/MenteeCard.tsx` is self-contained: it fetches its own snapshot from
  the API route. The GitHub token never reaches the browser.
- Linked issues are parsed from each PR body via
  `Fixes #N` / `Closes owner/repo#N` / `Resolves #N` and resolved to a title + URL.
- Commit streak = consecutive UTC days (ending today, today may be empty) with at
  least one `PushEvent`.

## Contribution drill-down

Click **Contribution breakdown & rank** on any mentee card to open `/mentee/:id`.

**Requires `GITHUB_TOKEN`.** Repo discovery uses GitHub's GraphQL API, which
rejects unauthenticated requests. A classic PAT with **no scopes** is enough. If
the token is missing the page says so explicitly instead of rendering empty.

### What each number means

| Column | Source | Exact? |
| --- | --- | --- |
| Repos contributed to | GraphQL `repositoriesContributedTo` (public only, includes repos they don't own) | exact |
| Rank | `/repos/:o/:r/contributors`, which GitHub returns pre-sorted by commit count | exact when shown as `#N` |
| Contributors total | `Link: rel="last"` page count on the same response | exact only without a trailing `+` |
| Commits | the `contributions` field on their contributor entry (all-time, default branch) | exact |
| Issues / PRs opened, merged, closed, open | scoped Search API counts (`repo:o/r author:u is:pr is:merged`, …) | exact |
| Closed-unmerged PRs | `opened − merged − open` | exact |
| Reviews | `repo:o/r reviewed-by:u` | exact |
| Commits / reviews in the KPI row | GraphQL `contributionsCollection` | exact, but **last 365 days only** — GitHub caps that API at a one-year window per query |
| Tech stack | file names from their last 20 merged PRs, sized by lines added | a sample, not all-time |

### Rank has four states, and they are not interchangeable

Rank counts **commits on the default branch**, so a real contributor can legitimately
have no rank. The UI distinguishes:

| Shown | Means |
| --- | --- |
| `#7 of 143 · top 5%` | ranked — 7th by commits |
| `>500` | has commits, but sits outside the contributor window GitHub exposes |
| `no commits` | checked the whole list — their work here is issues, reviews, or PRs merged to another branch. Commits authored under an email not linked to their GitHub account also don't count |
| `unknown` | **we couldn't finish checking** (rate limit, or GitHub declined an oversized contributor list) |

The last two look identical in raw data and mean opposite things, so they are
never merged. `unknown` is never rendered as zero.

### Tech stack: why merged-PR files and not repo languages

`/repos/:o/:r/languages` describes *the repo*, not your mentee. One Python script
contributed to a JavaScript monorepo would read as JavaScript. So the scan opens
their most recent merged PRs and counts the files they actually changed, weighted
by lines added. Lock files, `dist/`, `node_modules/`, generated `*.pb.go`, minified
bundles and binary assets are filtered out — otherwise one regenerated
`package-lock.json` would drown every real edit.

It is a **recent sample** (20 PRs), not a career summary, and it only sees merged
PRs — unmerged work and direct pushes don't appear.

### Cost and caching

A cold profile is roughly 50-70 API requests:

| Requests | What |
| --- | --- |
| 1 GraphQL | repo discovery + windowed contribution totals |
| ~4 GraphQL | per-repo issue/PR counts — 5 repos × 6 aliased searches per call |
| 1-5 REST per repo | contributor rank (1 call unless the repo is huge) |
| ~21 REST | merged-PR file scan |

So it never runs on a page render. Results are cached in Postgres
(`ContribProfile` / `RepoContrib` / `StackScan`) for `DEEP_PROFILE_TTL_HOURS`
(default 12), keyed by GitHub login. **Refresh** forces a refetch. If a refetch
fails, the previous copy is served with a visible stale notice rather than an
error page. A rate-limit floor keeps the fetcher from draining the hourly budget:
when it trips, the affected sections are marked partial instead of silently
reporting zeros.

Only the top 20 repos by the mentee's own activity are enriched; the page states
`showing 20 of N` rather than implying 20 is everything.

### Authorization

`GET /api/mentee/:username/deep` checks the session **and** that the username
belongs to a mentee under one of the calling lead's mentors. Without that second
check the route would be an open, expensive GitHub-scraping proxy for anyone with
a login.

### Verifying it

```bash
npx tsx scripts/verify-deep.ts <github-username> [owner/repo]
```

Exercises each stage against the live API and prints what came back — extension
classification and noise filtering, `Link` header parsing, contributor rank, the
search counts, the stack scan, and a full end-to-end profile. The REST stages run
without a token (at 60 req/hr); the GraphQL stages need `GITHUB_TOKEN`.

## Data model

See `prisma/schema.prisma`. Alongside the standard NextAuth adapter tables
(`User`, `Account`, `Session`, `VerificationToken`):

- `Mentor` — `{ id, userId (owner), name, github?, mentees[] }`
- `Mentee` — `{ id, mentorId, name, email, github }`
- `ContribProfile` — cached deep profile, keyed by GitHub login. Two leads
  tracking the same username share one entry; it holds only public GitHub data,
  so sharing it across tenants leaks nothing.
- `RepoContrib` — one row per enriched repo (rank, commits, issue/PR counts).
  `position` preserves fetch order so a cached read renders like a fresh one.
- `StackScan` — the merged-PR file breakdown, one row per profile.

`onDelete: Cascade` means deleting a lead removes their mentors, and deleting a
mentor removes its mentees. Add a new column, run `npm run db:push`, done.
