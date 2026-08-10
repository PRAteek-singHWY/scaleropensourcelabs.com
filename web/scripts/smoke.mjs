// Post-restart smoke test. A 200 on the page proves nothing: this dev server has
// twice served correct HTML while 404ing its own chunks, so nothing hydrated and
// every other check still passed.
import { chromium } from "playwright";

import { SITE, assertOurSite } from "./assert-site.mjs";
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const bad = [];
pg.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(/^.*?\/_next/, "_next")}`); });
pg.on("pageerror", (e) => bad.push(`pageerror ${String(e).slice(0, 200)}`));
await pg.goto(SITE, { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(2200);
let failed = 0;
const ok = (n, v) => {
  if (!v) failed++;
  console.log(`  ${v ? "PASS" : "FAIL"}  ${n}`);
};
ok("no failed requests / page errors", bad.length === 0);
bad.slice(0, 6).forEach((l) => console.log("        " + l));
// Positional selectors rot. `nav button` used to be the theme toggle; adding the
// outline toggle made it the first match, so this reported the theme control
// broken when it was fine. Both are now selected by what they ARE.
const THEME = '[aria-label^="Theme:"]';
const OUTLINE = '[aria-controls="page-outline"]';

ok("hydrated (theme icon visible)", await pg.evaluate((sel) => getComputedStyle(document.querySelector(sel).querySelector("span")).opacity === "1", THEME));
const before = await pg.evaluate(() => document.documentElement.getAttribute("data-theme"));
await pg.click(THEME);
await pg.waitForTimeout(400);
ok("theme toggle changes theme", before !== (await pg.evaluate(() => document.documentElement.getAttribute("data-theme"))));

// The outline is a feature now, so it belongs in the smoke test.
ok("outline absent until asked for", await pg.evaluate(() => !document.querySelector("#page-outline")));
await pg.click(OUTLINE);
await pg.waitForTimeout(400);
// Derived, not hardcoded. This asserted 14 and failed the moment a fifteenth
// section was legitimately added — the point is that the outline matches the page,
// not that the page has a particular number of sections.
ok(
  "outline lists every section on the page",
  await pg.evaluate(() => {
    const sections = document.querySelectorAll("section[id]").length;
    const links = document.querySelectorAll("#page-outline a").length;
    return sections > 0 && links === sections;
  }),
);
await pg.click(OUTLINE);
await pg.waitForTimeout(300);
ok("outline closes again", await pg.evaluate(() => !document.querySelector("#page-outline")));
ok("NO canvas anywhere (3D removed)", await pg.evaluate(() => document.querySelectorAll("canvas").length === 0));
// The plate is on the NAV, not on the header. It moved when the nav became a
// floating glass plate: the <header> is now a transparent fixed positioning
// wrapper (`inset-x-0 top-3 z-50`) and the <nav> inside it carries `.plate`. This
// asserted against the wrapper and so measured rgba(0,0,0,0) — a red check on a
// plate that composites perfectly.
//
// Exactly the rot the note above THEME/OUTLINE describes, so it takes the same
// cure: select the element by what it IS rather than by its position in the tree.
ok("nav plate composites", await pg.evaluate(() => getComputedStyle(document.querySelector('nav[aria-label="Main"]')).backgroundColor !== "rgba(0, 0, 0, 0)"));
const h = await pg.evaluate(() => document.body.scrollHeight);
console.log(`  page height: ${h}px`);
await b.close();

// Non-zero on any failure, or CI passes while the page serves no JavaScript.
if (failed > 0) process.exitCode = 1;
