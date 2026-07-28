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
- **Mentees never log in.** Their public data is read via GitHub REST API v3. No
  OAuth, no permissions, ever.
- **Full activity analytics per mentee** — commits (30-day bar chart + streak),
  pull requests (open / merged / closed with merge rate), issues (open / closed),
  community engagement (threads commented on), followers, stars, and active repos.
  Plus a **program overview**: aggregate totals across the cohort and a commits
  leaderboard. Charts are dependency-free inline SVG, validated for the dark surface.
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
GITHUB_TOKEN=                # optional PAT (no scopes) for 5000 req/hr instead of 60
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
npm run db:push          # creates the Postgres tables from prisma/schema.prisma
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
   - `GITHUB_TOKEN` — classic PAT with **no scopes** (public data is enough), optional but recommended
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

## Data model

See `prisma/schema.prisma`. Alongside the standard NextAuth adapter tables
(`User`, `Account`, `Session`, `VerificationToken`):

- `Mentor` — `{ id, userId (owner), name, github?, mentees[] }`
- `Mentee` — `{ id, mentorId, name, email, github }`

`onDelete: Cascade` means deleting a lead removes their mentors, and deleting a
mentor removes its mentees. Add a new column, run `npm run db:push`, done.
