// Design faults that measure: children escaping their section, asymmetric gutters,
// and grid rows left half-empty. Eyeballing a screenshot cannot tell a deliberate
// asymmetry from an accident, but the numbers can.
import { chromium } from "playwright";

import { SITE, assertOurSite } from "./assert-site.mjs";
const b = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await pg.goto(SITE, { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(2000);

const rows = await pg.evaluate(() => {
  const out = [];
  for (const s of document.querySelectorAll("section[id]")) {
    if (s.id === "hall") continue;
    const sr = s.getBoundingClientRect();
    let worstBottom = 0, worstRight = 0;
    for (const el of s.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      worstBottom = Math.max(worstBottom, r.bottom - sr.bottom);
      worstRight = Math.max(worstRight, r.right - sr.right);
    }
    // Trailing gap in the last row of any grid: a 3-col grid with 4 items leaves
    // two empty cells, which reads as unfinished unless it was intended.
    const grids = [...s.querySelectorAll("*")].filter((e) => getComputedStyle(e).display === "grid");
    const orphans = grids.map((g) => {
      const cols = getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length;
      const n = [...g.children].filter((c) => c.getBoundingClientRect().height > 0).length;
      const rem = n % cols;
      return cols > 1 && rem !== 0 ? `${n} in ${cols}-col (last row ${rem}/${cols})` : null;
    }).filter(Boolean);
    out.push({ id: s.id, overflowBottom: Math.round(worstBottom), overflowRight: Math.round(worstRight), orphans });
  }
  return out;
});

for (const r of rows) {
  const flags = [];
  if (r.overflowBottom > 1) flags.push(`escapes bottom by ${r.overflowBottom}px`);
  if (r.overflowRight > 1) flags.push(`escapes right by ${r.overflowRight}px`);
  r.orphans.forEach((o) => flags.push(`ragged grid: ${o}`));
  console.log(`  ${r.id.padEnd(15)} ${flags.length ? flags.join("; ") : "clean"}`);
}
await b.close();
