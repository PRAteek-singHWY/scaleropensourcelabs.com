# Scaler Open Source Club

The public website for the Scaler Open Source Club — the students it has placed
into international open-source programmes, what those programmes are, and how to
join.

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

Two optional variables, needed only to make the join form submit somewhere real:

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_APPLY_ENDPOINT` | Where the join form POSTs. Unset, the form renders and validates but does not submit. |
| `NEXT_PUBLIC_COHORT_DEADLINE` | A real date, shown near the form. Unset, no deadline is claimed. |

> **Do not run `npm run build` while `npm run dev` is running.** They share the
> `.next` directory, so building deletes the chunks the dev server is serving. The
> page keeps returning 200 and looks correct, but no JavaScript loads — the theme
> toggle goes dead and nothing hydrates. If that happens: `rm -rf .next`, restart,
> and confirm with `node scripts/smoke.mjs`.

---

## Contributing

Read **[CONTRIBUTING.md](../CONTRIBUTING.md)** first. The short version:

Almost all content lives in one file — **`content/club.ts`**. Adding a student, a
mentor, a project or an FAQ entry means editing a typed array there, not touching a
component. If TypeScript compiles, the shape is right.

| You want to add | Edit |
|---|---|
| A student selected into GSoC / LFX / C4GT / SoB | `SELECTIONS` |
| A mentor | `MENTORS` |
| A project the club has contributed to | `PROJECTS` |
| A question people keep asking | `FAQ` |
| A date in the programme timeline | `CALENDAR` |

Photos go in `public/people/` and are named by the `photo` field. A missing photo is
fine — it falls back to a designed monogram, not a broken image.

### Two rules that are not negotiable

**1. Nobody appears on this site without their own permission.** Every entry in
`SELECTIONS` and `MENTORS` carries a `consented` boolean, and anything without it
set to `true` is not rendered. Not a formality — these are named students shown to
an international audience.

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
npm run build        # must pass; the site is fully static
npm run qa           # accessibility + layout sweep — needs the dev server running
```

`npm run qa` drives real Chromium across three viewports × both themes and reports
overflow, text under 11px, tap targets under 44px, missing alt text, heading-order
breaks and contrast failures. **It must report zero.**

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
    layout.tsx         fonts, metadata, pre-paint anti-flash script
    page.tsx           section order for the whole page
  components/
    hall/              the selected students, and the roster table
    hero/              type-led hero
    Portrait.tsx       photo with a designed monogram fallback
    ApplyForm.tsx      the join form
    Nav.tsx  ThemeToggle.tsx  Mentors.tsx  …
  content/
    club.ts            ← all content lives here
  public/people/       member photos
  scripts/             Playwright checks
```
