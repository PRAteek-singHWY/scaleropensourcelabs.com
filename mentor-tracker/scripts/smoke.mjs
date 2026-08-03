// Post-restart smoke test. A 200 on the page proves nothing: this dev server has
// twice served correct HTML while 404ing its own chunks, so nothing hydrated and
// every other check still passed.
import { chromium } from "playwright";
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const bad = [];
pg.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(/^.*?\/_next/, "_next")}`); });
pg.on("pageerror", (e) => bad.push(`pageerror ${String(e).slice(0, 200)}`));
await pg.goto("http://localhost:3001", { waitUntil: "networkidle" });
await pg.waitForTimeout(2200);
let failed = 0;
const ok = (n, v) => {
  if (!v) failed++;
  console.log(`  ${v ? "PASS" : "FAIL"}  ${n}`);
};
ok("no failed requests / page errors", bad.length === 0);
bad.slice(0, 6).forEach((l) => console.log("        " + l));
ok("hydrated (toggle icon visible)", await pg.evaluate(() => getComputedStyle(document.querySelector("nav button span")).opacity === "1"));
const before = await pg.evaluate(() => document.documentElement.getAttribute("data-theme"));
await pg.click("nav button");
await pg.waitForTimeout(400);
ok("toggle changes theme", before !== (await pg.evaluate(() => document.documentElement.getAttribute("data-theme"))));
ok("NO canvas anywhere (3D removed)", await pg.evaluate(() => document.querySelectorAll("canvas").length === 0));
ok("nav plate composites", await pg.evaluate(() => getComputedStyle(document.querySelector("header")).backgroundColor !== "rgba(0, 0, 0, 0)"));
const h = await pg.evaluate(() => document.body.scrollHeight);
console.log(`  page height: ${h}px`);
await b.close();

// Non-zero on any failure, or CI passes while the page serves no JavaScript.
if (failed > 0) process.exitCode = 1;
