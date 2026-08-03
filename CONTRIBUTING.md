# Contributing

This is the Scaler Open Source Club's own website, and it is also meant to be a
first open-source contribution for club members. If this is your first pull request
anywhere, you are the intended audience — say so in the PR and someone will walk
you through it.

## Setup

```bash
git clone https://github.com/<org>/<repo>.git
cd <repo>/web
npm install
npm run dev          # http://localhost:3000
```

No credentials, no database, no `.env`. If `npm run dev` needs anything from you
beyond those commands, that is a bug — please open an issue.

## The one file that matters

Almost every contribution is an edit to **`web/content/club.ts`**. It
holds all the site's content as typed arrays. You do not need to touch a React
component to add a person, a project, or an answer.

```ts
// content/club.ts
export const SELECTIONS: Selection[] = [
  {
    name: "Full Name",
    programme: "GSOC",              // GSOC | LFX | C4GT | SOB | OUTREACHY
    year: "2026",
    org: "The organisation that selected them",
    work: "One specific sentence on what they actually built.",
    photo: "/people/full-name.jpg", // optional
    github: "their-login",          // optional
    url: "https://link-that-proves-it",
    consented: true,                // REQUIRED — see below
  },
];
```

Run `npm run typecheck`. If it passes, the shape is right.

## Two rules that get PRs closed

### 1. Nobody appears on this site without their own permission

Every person entry carries `consented`. Anything not explicitly `true` is filtered
out and never rendered.

Do not set `consented: true` on someone else's behalf because you think they would
not mind. These are named students, with photos, shown to an international
audience — including people who may not want their name attached to a specific
organisation publicly. Ask them, then set the flag.

### 2. Every factual claim carries a link to a primary source

The site has no testimonials and no placement statistics. External verifiability is
the only thing making it credible, and the whole page is built on "you can check
this". So:

- A number needs a link to the page that states that number.
- The linked page must state **the same** number. Citing 1,272 while linking a
  source that says 1,280 is the exact failure this rule exists to prevent — that
  one shipped once and had to be corrected.
- If you cannot find a primary source, the claim does not go in. This has already
  cost two good-sounding lines: an invented "only 9 people per college make ICPC"
  figure that no rulebook or dataset produces, and "open source is an easier door
  than ICPC", which is false — GSoC 2025 accepted 1,280 of 15,240 applicants.

A weaker claim you can prove beats a stronger one you cannot.

## Writing

Match the voice already there. Concretely:

- **Say what happened, not how it felt.** "Merged a parser fix into OpenCRE" beats
  "made an amazing contribution".
- **No adjectives describing people.** Attach them to work instead.
- **Sentence case.** No exclamation marks.
- **Prefer the specific.** "Three terms a year" beats "runs frequently".

## Before you open a pull request

```bash
npm run typecheck    # must pass
npm run build        # must pass
npm run qa           # must report 0 issues — needs `npm run dev` in another terminal
```

`npm run qa` drives real Chromium across three viewports × both themes. It checks
contrast, tap-target sizes, text size, heading order, alt text and horizontal
overflow. **Zero issues is the bar**, and it is not negotiable for a site whose
audience includes people reading it on a phone on campus wifi.

If you changed anything visual, also **look at it in both themes**. On this project
that has caught bugs every single time — including a wordmark rendering at 1.11:1
(black on black) that every automated checker passed, because the checker read the
declared token and the element was rendering transparent.

> Do not run `npm run build` while `npm run dev` is running. They share `.next`, so
> the build deletes the chunks the dev server is serving. The page still returns
> 200 and looks fine, but no JavaScript loads. Recover with `rm -rf .next` and a
> restart; `node scripts/smoke.mjs` confirms.

## Pull requests

- One change per PR. A content addition and a layout refactor are two PRs.
- Say what you changed and why. If it is visual, attach a before/after screenshot
  in both themes.
- Link the issue if there is one.
- Do not commit `study/` output, `node_modules`, `.next`, or any `.env` file. All
  are gitignored already; if something slipped through, that is worth an issue.

## Good first issues

Look for the `good first issue` label. Genuinely useful starting points:

- Add a selection, mentor or project to `content/club.ts` (with consent + proof).
- Add an FAQ entry for a question you actually had before joining.
- Fix a `npm run qa` failure on a viewport we have not looked at closely.
- Improve a section's copy to be more specific and less promotional.

## Code of conduct

Be straightforward and useful. Review the code, not the person. Nobody here is
expected to already know how open source works — that is the entire point of the
club.
