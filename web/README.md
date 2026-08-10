# Scaler Open Source Club

The public website for the Scaler Open Source Club — what open source is, what it
does to a student's career, the work the club's members have landed upstream, and
how to join.

Five pages plus a join form:

| Route | What it does |
|---|---|
| `/` | Essence — what open source is, why it matters, the club in numbers, one member's story |
| `/projects` | Build-day projects, club repositories, and members' upstream contributions |
| `/programs` | GSoC, LFX, Outreachy, C4GT, Summer of Bitcoin, GSSoC, Hacktoberfest |
| `/hall-of-fame` | Core team, alumni, achievers, and the organisations reached |
| `/how-to-join` | Four concrete entry paths, split by level |
| `/join` | The application form, linked from the nav on every page |

Every page ends with exactly one next action, and the nav carries a Join button that
stays visible at every scroll position.

Live at **[scaleropensourcelabs.com](https://scaleropensourcelabs.com)**.

It is a **static site**. No database, no authentication, no API routes, no
server-side rendering at request time. Every page is prerendered at build time, so
anyone can run the whole thing locally with two commands and no credentials.

> Earlier commits in this repository were a **private mentorship dashboard** with
> Postgres, NextAuth and GitHub token access. All of it was removed deliberately.
> If you are reading old history and wondering where the Prisma schema went — it
> was deleted, and nothing in the current site needs it.

---

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

That is the whole setup. There is no `.env` to fill in to see the site.

All optional, needed only to make the join form submit somewhere real. See
`.env.example` for the full notes.

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | The six web-config values from the Firebase console. All six, or the form treats itself as unconfigured. |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_KEY` | reCAPTCHA v3 site key for App Check. Production only — leave empty locally. |
| `NEXT_PUBLIC_COHORT_DEADLINE` | A real date, shown near the form. Unset, no deadline is claimed. |

**Setting Firebase up for the first time: [FIREBASE.md](../FIREBASE.md).** It covers
creating the project, the one console setting that would otherwise publish every
applicant's details, deploying the rules, App Check, and a troubleshooting table.

`NEXT_PUBLIC_` on the Firebase values is correct and not an oversight: a Firebase web
config is a public identifier, not a credential. The security boundary is
[`firestore.rules`](../firestore.rules) — applications are create-only and no client
can read them. Deploy rule changes with `firebase deploy --only firestore:rules`;
editing the file alone changes nothing.

`npm run rules` checks that the rules and the form still agree about the allowed
values. They are two copies of the same list — Firestore rules cannot import — so it
fails the build if they drift.

> **Do not run `npm run build` while `npm run dev` is running.** They share the
> `.next` directory, so building deletes the chunks the dev server is serving. The
> page keeps returning 200 and looks correct, but no JavaScript loads — the theme
> toggle goes dead and nothing hydrates. If that happens: `rm -rf .next`, restart,
> and confirm with `node scripts/smoke.mjs`.

---

## Contributing

Read **[CONTRIBUTING.md](../CONTRIBUTING.md)** first. The short version:

All content lives in typed arrays under **`content/`**, one module per page. Adding
a student, a project or an FAQ entry means editing an array there, not touching a
component. If TypeScript compiles, the shape is right.

| You want to add | Edit |
|---|---|
| Somebody selected into GSoC / LFX / Outreachy / C4GT / SoB, or a hackathon win | `people.ts` → `ACHIEVERS` |
| A core team member or an alumnus | `people.ts` → `CORE_TEAM` / `ALUMNI` |
| An organisation our code reached | `people.ts` → `ORGS` |
| A build-day project or a club repository | `projects.ts` → `BUILD_DAY` / `CLUB_REPOS` |
| An upstream contribution | `projects.ts` → `UPSTREAM` |
| A programme, or a row in the reverse clock | `programs.ts` → `PROGRAMMES` / `CALENDAR` |
| An entry path, or a question people keep asking | `join.ts` → `PATHS` / `FAQ` |
| A member's first-person story | `essence.ts` → `STORIES` |

Sections with no real entries yet render **obvious placeholders in development and
nothing at all in production**, gated on `NODE_ENV`. A grid cannot be designed
against an empty array, but a production build must never ship an invented name.

Photos go in `public/people/` and are named by the `photo` field. A missing photo is
fine — it falls back to a designed monogram, not a broken image.

### Two rules that are not negotiable

**1. Nobody appears on this site without their own permission.** Every entry naming
a person — `ACHIEVERS`, `CORE_TEAM`, `ALUMNI`, `STORIES` — carries a `consented`
boolean, and anything without it set to `true` is filtered out and never rendered.
Not a formality: these are named students, with photos, shown to an international
audience, attached to a specific organisation or employer.

**2. Every factual claim carries a link to a primary source.** The site has no
testimonials and no placement statistics, so external verifiability is the only
thing making it credible. A number without a source gets removed, however good it
sounds. Two claims were already cut for failing this: an invented "9 people make
ICPC per college" figure, and "open source is an easier door than ICPC" — it is
not, GSoC 2025 accepted 1,280 of 15,240 applicants.

---

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run palette      # categorical colour constraints, contrast, CVD separation
npm run build        # must pass; the site is fully static
npm run smoke        # is client JS alive? — needs the dev server running
npm run qa           # accessibility + layout sweep — same
npm run browsers     # the same features across Chromium, WebKit and Firefox
```

`npm run qa` drives real Chromium across **all six routes × four viewports × both
themes** — 48 combinations — and reports overflow, text under 11px, tap targets under
44px, missing alt text, heading-order breaks, contrast failures, and `.tap` combined
with a margin utility. **It must report zero.**

Run `smoke` before `qa`: a page serving no JavaScript passes most of what `qa`
checks. `smoke` asserts hydration on every route, that the Join button is visible at
44px everywhere, and that the outline panel and scroll reveals re-derive after a
client-side navigation — none of which a screenshot of a hard-loaded page would show.

All the check scripts hit `http://localhost:3000` by default. If your dev server is
elsewhere, set `SITE_URL`:

```bash
SITE_URL=http://localhost:3001 npm run qa
```

Each script asserts it has reached *this* site before measuring, and fails loudly
otherwise. That guard exists because an unrelated app was once listening on 3000:
our dev server had died with `EADDRINUSE`, curl still returned 200, and the sweep
measured the other application and reported 32 accessibility issues against it.
Every one was a false positive about somebody else's page.

The other scripts exist because computed styles lie:

| Script | What it catches |
|---|---|
| `smoke.mjs` | The page returns 200 but no client JS loaded |
| `pixel-contrast.mjs` | Contrast of a translucent surface, sampled from rendered pixels rather than declared tokens |
| `geometry.mjs` | Children escaping their section, ragged grid rows |
| `nav-surface.mjs` | The nav plate against whatever is actually behind it |
| `palette.mjs` | Categorical colours that are indistinguishable under colour-vision deficiency. Pass `--legacy` to reproduce the failure that retired the old per-programme palette |

Each was written after a real bug that a passing checker had hidden.
`pixel-contrast.mjs` exists because `getComputedStyle` reported a background token
on an element that was rendering fully transparent, hiding a wordmark at 1.11:1.

---

## How it is built

| | |
|---|---|
| Framework | Next.js 14, App Router, fully static |
| Language | TypeScript |
| Styles | Tailwind CSS over CSS custom properties |
| Checks | Playwright (headless Chromium) |
| Licence | MIT |

### Theming

Light and dark are one token system, not two stylesheets. Every colour resolves
through a CSS custom property defined per theme in `app/globals.css`; components
only ever name tokens, so the two themes cannot drift apart.

Tokens are stored as **space-separated RGB channels** (`--bg: 251 251 253`) and
consumed as `rgb(var(--bg) / <alpha-value>)`. This is load-bearing: given a hex
value, Tailwind's alpha modifier has nothing to substitute into, so `bg-bg/70`
compiles to an invalid colour and the element renders **fully transparent**. That
failed silently in 18 places once. To use a token as a whole colour in plain CSS,
write `rgb(var(--x))`.

There is no pinned-dark section any more — every section follows the reader's theme.

### Directory map

```
web/
  app/
    globals.css        theme tokens — read the comment block at the top first
    layout.tsx         fonts, metadata, anti-flash script, Nav + Reveal + Footer
    page.tsx           Essence (home)
    projects/  programs/  hall-of-fame/  how-to-join/  join/
  components/
    hero/Hero.tsx      type-led hero
    Nav.tsx            sticky nav, five links, pinned Join button
    NextAction.tsx     the single closing action every page ends with
    JoinForm.tsx       the application form
    CommitGraph.tsx    fork → commits → merge, as line art
    PRTimeline.tsx     what actually happens to a pull request
    Terminal.tsx       real, copyable commands
    Achievers.tsx  OrgWall.tsx  NumbersStrip.tsx  MemberStory.tsx
    Portrait.tsx       photo with a designed monogram fallback
    Outline.tsx  ThemeToggle.tsx  Reveal.tsx  Footer.tsx  …
  content/            ← all content lives here, one module per page
    site.ts  essence.ts  projects.ts  programs.ts  people.ts  join.ts
  public/people/       member photos
  scripts/             Playwright checks
```
