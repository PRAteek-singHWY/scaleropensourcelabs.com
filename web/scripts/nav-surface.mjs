// The wordmark's contrast against the nav plate, SAMPLED FROM RENDERED PIXELS.
//
// This is the check that caught the worst bug this project has had. The nav plate is
// `rgb(var(--bg) / 0.8)` over a backdrop-filter, and `getComputedStyle` cheerfully
// reported that declared token while the element was rendering FULLY TRANSPARENT —
// so the wordmark was sitting at 1.11:1 on the dark hero and every automated check
// passed. Only reading the actual pixels showed it.
//
// So nothing here asks the DOM what colour anything is. It screenshots the top 56px,
// finds the darkest-or-lightest pixel inside the wordmark's own box, compares it
// against a plate pixel sampled beside the wordmark, and reports the ratio.
//
// REWRITTEN FOR THE MULTI-PAGE SITE. The previous version scrolled to `#programmes`
// and `#hall` on the home page and sampled "day" and "night" surfaces. Neither id
// exists any more — it would have thrown on `null.offsetTop` — and there are no
// pinned-dark sections left either, so the day/night framing was obsolete twice over.
// What still matters is that the plate composites correctly over every DIFFERENT
// surface the nav can pass over: the page background, a full-bleed `.band`, and a
// raised card. Those are sampled per route, in both themes.

import { chromium } from "playwright";
import { PNG } from "pngjs";
import { ROUTES, SITE, assertOurSite } from "./assert-site.mjs";

const BASE = SITE.replace(/\/$/, "");
const NAV_H = 56;

const lum = ([r, g, b]) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const b = await chromium.launch();
let failures = 0;

for (const theme of ["light", "dark"]) {
  console.log(`\n  === ${theme} ===`);
  const pg = await (
    await b.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();

  for (const route of ROUTES) {
    await pg.goto(BASE + route.path, { waitUntil: "networkidle" });
    await assertOurSite(pg);
    await pg.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await pg.waitForTimeout(600);

    // Scroll targets: the top of the page, then whatever distinct surfaces this route
    // actually has. Derived from the DOM rather than named, so a page without a band
    // is sampled at what it does have instead of throwing.
    const stops = await pg.evaluate(() => {
      const out = [{ label: "top", y: 0 }];
      const band = document.querySelector(".band");
      if (band) out.push({ label: "band", y: band.offsetTop + 120 });
      const card = document.querySelector(".bg-raise, [class*='bg-raise']");
      if (card) out.push({ label: "card", y: card.offsetTop + 60 });
      return out;
    });

    for (const stop of stops) {
      await pg.evaluate((v) => scrollTo(0, v), stop.y);
      await pg.waitForTimeout(450);

      const buf = await pg.screenshot({ clip: { x: 0, y: 0, width: 1440, height: NAV_H } });
      const png = PNG.sync.read(buf);
      const at = (x, y) => {
        const i = (png.width * y + x) << 2;
        return [png.data[i], png.data[i + 1], png.data[i + 2]];
      };

      const box = await pg.evaluate(() => {
        const r = document
          .querySelector('nav[aria-label="Main"] a')
          .getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });

      // THE PLATE PIXEL IS THE HARD PART, and getting it wrong invented fifteen
      // failures on the first run. Sampling "40px to the right of the wordmark, on
      // the wordmark's own row" lands on the next nav LINK's glyphs — so `plate` came
      // back as rgb(17,17,17) in light theme, which is the ink token, and every ratio
      // was really wordmark-ink against link-ink. All six dark routes reported
      // 2.56:1 and none of it was real.
      //
      // The nav is 56px tall with its controls vertically centred, so glyphs occupy
      // roughly y 18-38 and the top few rows are plate and nothing else. Sampling a
      // whole row there and taking the MEDIAN also survives a stray antialiased pixel
      // or a focus ring.
      const plateRow = [];
      for (const y of [3, 5]) {
        for (let x = 8; x < 1432; x += 8) plateRow.push(at(x, y));
      }
      plateRow.sort((p, q) => lum(p) - lum(q));
      const plate = plateRow[Math.floor(plateRow.length / 2)];

      // The wordmark's own extreme pixel: whichever is furthest from the plate.
      let ink = plate;
      for (let y = box.y + 2; y < Math.min(box.y + box.h - 2, NAV_H); y++) {
        for (let x = box.x; x < box.x + box.w; x++) {
          const p = at(x, y);
          if (Math.abs(lum(p) - lum(plate)) > Math.abs(lum(ink) - lum(plate))) ink = p;
        }
      }

      const r = ratio(ink, plate);
      const ok = r >= 4.5;
      if (!ok) failures++;
      console.log(
        `    ${ok ? "ok  " : "FAIL"} ${route.name.padEnd(13)} ${stop.label.padEnd(5)} ` +
          `plate rgb(${String(plate).padEnd(13)}) wordmark ${r.toFixed(2)}:1`,
      );
    }
  }
  await pg.close();
}

await b.close();
console.log(`\n  ${failures} failure(s)`);
if (failures) process.exitCode = 1;
