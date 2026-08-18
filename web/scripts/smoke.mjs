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
  ok(`${label} Join button visible at >=44px`, state.joinVisible);
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

await pg.goto(`${BASE}/join?path=program-track`, { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(700);
// /join IS BEHIND SIGN-IN NOW, so the two assertions that used to live here — that the
// form preselects ?path and rejects a bogus one — cannot run from a signed-out browser:
// there is no #af-path to read until somebody has signed in with a college Google
// account, which needs the Auth emulator and a popup. That behaviour did not go away and
// is not untested; it moved to scripts/e2e-auth.mjs, which signs in for real against the
// Auth emulator. Run it with `npm run e2e:auth`.
//
// What smoke can still assert is the part that would silently break the funnel: that the
// gate is what renders, and that the QUERY STRING SURVIVES it. Every page's closing
// action links to /join?path=<id>, and sign-in does not navigate — so if the param were
// ever dropped here, the preselection would be dead no matter how correct the form is.
await pg.goto(`${BASE}/join?path=program-track`, { waitUntil: "networkidle" });
await pg.waitForTimeout(900);
ok(
  "join shows the sign-in step to a signed-out reader",
  await pg.evaluate(() =>
    /sign in with your college account/i.test(document.querySelector("main")?.innerText ?? ""),
  ),
);
ok(
  "join keeps ?path through the sign-in gate",
  new URL(pg.url()).searchParams.get("path") === "program-track",
);
// The form must NOT be reachable without signing in. This is a UI assertion, not a
// security one — the boundary is firestore.rules — but a form rendering to a signed-out
// visitor would mean the gate had broken open.
ok(
  "the profile form is not rendered before sign-in",
  (await pg.evaluate(() => document.querySelectorAll("#pf-path, #pf-name").length)) === 0,
);

await b.close();

// Non-zero on any failure, or CI passes while the site serves no JavaScript.
if (failed > 0) process.exitCode = 1;
