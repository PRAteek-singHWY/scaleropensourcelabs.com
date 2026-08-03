// The nav is bg-bg/70 with a backdrop blur, fixed over a near-black WebGL hero.
// A contrast check that reads the declared background sees a solid token; what a
// reader actually sees is that token composited over whatever is behind it. Only
// the rendered pixels tell the truth, so sample them.
import { chromium } from "playwright";
import { PNG } from "pngjs";
import fs from "node:fs";

const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const b = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
for (const scheme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const pg = await ctx.newPage();
  await pg.goto("http://localhost:3001", { waitUntil: "networkidle" });
  await pg.waitForTimeout(2200);
  const buf = await pg.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 46 } });
  const png = PNG.sync.read(buf);
  const at = (x, y) => { const i = (png.width * y + x) << 2; return [png.data[i], png.data[i+1], png.data[i+2]]; };

  // Darkest and lightest pixel inside the OSC wordmark's box vs. the plate beside it.
  const box = await pg.evaluate(() => { const r = document.querySelector("nav a").getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  let ink = null, plate = at(box.x + box.w + 40, 22);
  for (let y = box.y + 4; y < box.y + box.h - 4; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      const p = at(x, y);
      const d = Math.abs(lum(p) - lum(plate));
      if (!ink || d > Math.abs(lum(ink) - lum(plate))) ink = p;
    }
  const r = ratio(ink, plate);
  console.log(`  ${scheme.padEnd(6)} OSC rgb(${ink}) on plate rgb(${plate})  ${r.toFixed(2)}:1  ${r >= 4.5 ? "PASS" : "*** FAIL (needs 4.5) ***"}`);
  await ctx.close();
}
await b.close();
