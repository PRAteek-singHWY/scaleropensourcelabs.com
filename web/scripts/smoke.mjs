// Post-restart smoke test.
//
//   node scripts/smoke.mjs
//
// A 200 on the page proves nothing. This dev server has twice served correct HTML
// while 404ing its own chunks, so nothing hydrated and every other check still
// passed — the theme toggle was dead, the reveals never ran, and the page looked
// entirely fine in a screenshot. So this asserts behaviour that only exists if
// JavaScript actually loaded and ran.
//
// It sweeps every route, because a single-page smoke test on a six-page site checks
// one sixth of it and prints "PASS".
//
// The client-side navigation checks near the end are regression tests for a specific
// bug introduced by moving Nav, Reveal and Outline into the shared layout: that
// layout does NOT remount between routes, so a mount-only effect keeps the first
// page's state forever. Reveal would stop marking sections and Outline would list the
// home page's sections on every other page. Neither is visible in a screenshot of a
// hard-loaded page — only navigating within the app shows it.

import { chromium } from "playwright";
import { ROUTES, SITE, assertOurSite } from "./assert-site.mjs";

const BASE = SITE.replace(/\/$/, "");
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const bad = [];
pg.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(/^.*?\/_next/, "_next")}`);
});
pg.on("pageerror", (e) => bad.push(`pageerror ${String(e).slice(0, 200)}`));

let failed = 0;
const ok = (n, v) => {
  if (!v) failed++;
  console.log(`  ${v ? "PASS" : "FAIL"}  ${n}`);
};

// Selected by what they ARE, not by position. `nav button` used to be the theme
// toggle; adding the outline toggle made it the first match, so an earlier version of
// this file reported the theme control broken when it was fine.
const THEME = '[aria-label^="Theme:"]';
const OUTLINE = '[aria-controls="page-outline"]';
const JOIN = 'nav[aria-label="Main"] a[href^="/join"]';

// ---------------------------------------------------------------------------
// Every route, hard-loaded.

for (const route of ROUTES) {
  const before = bad.length;
  await pg.goto(BASE + route.path, { waitUntil: "networkidle" });
  await assertOurSite(pg);
  await pg.waitForTimeout(400);

  const state = await pg.evaluate(
    ({ joinSel, themeSel }) => {
      const join = document.querySelector(joinSel);
      const jr = join?.getBoundingClientRect();
      const theme = document.querySelector(themeSel);
      return {
        h1s: document.querySelectorAll("h1").length,
        // The persistent action must be present AND actually on screen at 44px, not
        // merely in the DOM. The previous nav silently clipped its last two items
        // into an unscrollable overflow, which is exactly this failure.
        joinVisible:
          !!jr && jr.width > 0 && jr.height >= 44 && jr.right <= window.innerWidth + 1,
        // Exactly one nav item may claim to be the current page.
        currentMarks: document.querySelectorAll(
          'nav[aria-label="Main"] [aria-current="page"]',
        ).length,
        hydrated: !!theme && getComputedStyle(theme.querySelector("span")).opacity === "1",
        sections: document.querySelectorAll("section[id]").length,
        mainH: !!document.querySelector("main#main"),
        canvases: document.querySelectorAll("canvas").length,
        docW: document.documentElement.scrollWidth,
        winW: window.innerWidth,
      };
    },
    { joinSel: JOIN, themeSel: THEME },
  );

  const label = route.path.padEnd(14);
  ok(`${label} no failed requests`, bad.length === before);
  bad.slice(before, before + 3).forEach((l) => console.log("          " + l));
  ok(`${label} exactly one h1`, state.h1s === 1);
  ok(`${label} <main id="main"> for the skip link`, state.mainH);
  // The app shell has no Join button by design — a member on their own dashboard is the
  // one reader who has definitively already joined. Asserted as ABSENT there rather than
  // skipped, so the shell losing its identity would still fail something.
  if (route.appShell) {
    ok(`${label} no Join button (app shell)`, !state.joinVisible);
  } else {
    ok(`${label} Join button visible at >=44px`, state.joinVisible);
  }
  // Five pages mark themselves; /join marks nothing. See ROUTES in assert-site.mjs.
  const wantCurrent = route.inNav ? 1 : 0;
  ok(
    `${label} nav current marks == ${wantCurrent}`,
    state.currentMarks === wantCurrent,
  );
  ok(`${label} hydrated (theme icon painted)`, state.hydrated);
  ok(`${label} no horizontal overflow`, state.docW <= state.winW + 1);
  ok(`${label} no canvas (3D removed)`, state.canvases === 0);
}

// ---------------------------------------------------------------------------
// Controls, on a page that has sections to outline.

await pg.goto(BASE + "/how-to-join", { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(400);

const themeBefore = await pg.evaluate(() =>
  document.documentElement.getAttribute("data-theme"),
);
await pg.click(THEME);
await pg.waitForTimeout(400);
ok(
  "theme toggle changes theme",
  themeBefore !==
    (await pg.evaluate(() => document.documentElement.getAttribute("data-theme"))),
);

ok(
  "outline absent until asked for",
  await pg.evaluate(() => !document.querySelector("#page-outline")),
);
await pg.click(OUTLINE);
await pg.waitForTimeout(400);
// Derived, not hardcoded. An earlier version asserted 14 and failed the moment a
// fifteenth section was legitimately added — the point is that the outline matches
// the page, not that the page has a particular number of sections.
ok(
  "outline lists every section on the page",
  await pg.evaluate(() => {
    const sections = document.querySelectorAll("section[id]").length;
    const links = document.querySelectorAll("#page-outline a").length;
    return sections > 0 && links === sections;
  }),
);

// ---------------------------------------------------------------------------
// Client-side navigation. The regression tests described at the top.

const afterNav = async (path) => {
  await pg.click(`nav[aria-label="Main"] a[href="${path}"]`);
  await pg.waitForFunction((p) => location.pathname === p, path, { timeout: 5000 });
  await pg.waitForTimeout(700);
  return pg.evaluate(() => {
    const sections = [...document.querySelectorAll("section[id]")].map((s) => s.id);
    const links = [...document.querySelectorAll("#page-outline a")].map((a) =>
      (a.getAttribute("href") || "").slice(1),
    );
    return {
      match: sections.length > 0 && sections.join(",") === links.join(","),
      sections: sections.length,
      links: links.length,
      // Reveal must have re-marked this page's sections. Without the pathname
      // dependency this is 0 on every page after the first.
      revealed: document.querySelectorAll("[data-reveal]").length,
      current: document.querySelectorAll('nav[aria-label="Main"] [aria-current="page"]')
        .length,
    };
  });
};

for (const path of ["/projects", "/hall-of-fame", "/"]) {
  const r = await afterNav(path);
  ok(`client-nav ${path.padEnd(14)} outline re-derived (${r.links}/${r.sections})`, r.match);
  ok(`client-nav ${path.padEnd(14)} reveal re-targeted (${r.revealed})`, r.revealed > 0);
  ok(`client-nav ${path.padEnd(14)} current page re-marked`, r.current === 1);
}

// ---------------------------------------------------------------------------
// The join form's path preselect, which every page's closing action relies on.
//
// THESE TWO ASSERTIONS ARE BACK IN SMOKE, and that is the clearest single measure of the
// application form being independent of sign-in again. While /join was gated they could
// not run here at all — there was no #af-path to read until somebody had signed in with a
// college Google account, which needs the Auth emulator and a popup — so they were moved
// to scripts/e2e-auth.mjs and only ran when somebody stood up two emulators.
//
// The funnel they protect is the whole site's: every page's closing action links to
// /join?path=<id>, and a reader who clicked "join the program track" is supposed to arrive
// with it chosen. That is now checkable by a signed-out browser with no emulator, no
// popup and no credentials, which means it runs on every push instead of by hand.

await pg.goto(`${BASE}/join?path=program-track`, { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(700);
ok(
  "the application form renders to a signed-out reader",
  (await pg.evaluate(() => document.querySelectorAll("#af-name, #af-email").length)) === 2,
);
ok(
  "join preselects ?path",
  (await pg.locator("#af-path").inputValue()) === "program-track",
);
// A hand-edited param must be ignored rather than submitted. The rules reject a path that
// is not on the list, so trusting this would present as a form that fails on submit for
// no visible reason.
await pg.goto(`${BASE}/join?path=not-a-real-path`, { waitUntil: "networkidle" });
await pg.waitForTimeout(700);
ok("a hand-edited ?path is ignored", (await pg.locator("#af-path").inputValue()) === "");
// THE TWO FORMS MUST NOT SWAP PLACES. #pf-* is the member profile, which belongs behind
// sign-in on /dashboard; #af-* is the anonymous application. If profile fields ever
// render here, the split has been undone — and the reverse check is below.
ok(
  "the profile form is not on the public application page",
  (await pg.evaluate(() => document.querySelectorAll("#pf-path, #pf-name").length)) === 0,
);

// ---------------------------------------------------------------------------
// And the other door: /dashboard is where sign-in lives, and it must show a signed-out
// reader the card rather than anybody's details. A UI assertion, not a security one — the
// boundary is firestore.rules — but a dashboard rendering fields to a stranger would mean
// the gate had broken open.

await pg.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(900);
ok(
  "the dashboard shows a signed-out reader the sign-in card",
  await pg.evaluate(() => {
    const t = document.querySelector("main")?.innerText ?? "";
    // Either the real card or the honest "not configured" one, depending on whether this
    // deployment has a Firebase config. Both are correct answers here; a profile is not.
    return (
      /sign in with your college account/i.test(t) || /sign-in is not set up here/i.test(t)
    );
  }),
);
ok(
  "and no form fields of either kind before sign-in",
  (await pg.evaluate(
    () => document.querySelectorAll("#pf-name, #af-name").length,
  )) === 0,
);

await b.close();

// Non-zero on any failure, or CI passes while the site serves no JavaScript.
if (failed > 0) process.exitCode = 1;
