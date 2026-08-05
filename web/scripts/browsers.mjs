// Cross-engine check. Everything until now ran in Chromium — Playwright's default
// and the engine behind the Chrome extension — so Safari and Firefox were entirely
// unverified. Safari matters most: it is the majority of mobile traffic in India,
// and this design leans on several features with real engine differences.
//
// Each assertion targets a specific feature that could plausibly differ, and every
// one is MEASURED, not inferred from a support table.
import { chromium, webkit, firefox } from "playwright";
import { SITE, assertOurSite } from "./assert-site.mjs";

const ENGINES = { chromium, webkit, firefox };
let failures = 0;

for (const [name, engine] of Object.entries(ENGINES)) {
  const b = await engine.launch();
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 90)));
  await pg.goto(SITE, { waitUntil: "networkidle" });
  await assertOurSite(pg);
  await pg.waitForTimeout(2200);

  const r = await pg.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const cs = (s, prop) => { const e = q(s); return e ? getComputedStyle(e)[prop] : null; };
    const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      // The frosted nav plate — saturate() inside backdrop-filter.
      plate: cs("header", "backdropFilter") || cs("header", "webkitBackdropFilter"),
      // rgb(var(--x) / a): the token format the whole palette depends on.
      tokenAlpha: cs("header", "backgroundColor"),
      // Container queries, which size the monogram initials.
      cqSupported: CSS.supports("container-type", "inline-size"),
      monogramFont: (() => { const e = q('#hall [role="img"] span'); return e ? getComputedStyle(e).fontSize : null; })(),
      // The `lh` unit, added for the card name min-height. Newer than the rest.
      lhSupported: CSS.supports("min-height", "2lh"),
      nameBox: box("#hall h3"),
      // color-mix, used by ::selection and the hall's active tint.
      colorMix: CSS.supports("color", "color-mix(in srgb, red 50%, blue)"),
      // text-wrap: balance on headlines.
      balance: CSS.supports("text-wrap", "balance"),
      // The fonts actually resolving rather than falling back.
      display: cs("h1", "fontFamily").split(",")[0].replace(/["']/g, ""),
      body: cs("body", "fontFamily").split(",")[0].replace(/["']/g, ""),
      // The full-bleed band reaching both edges.
      bandOk: (() => {
        const el = q(".band"); if (!el) return null;
        const bb = el.getBoundingClientRect();
        const bp = getComputedStyle(el, "::before");
        const l = bb.left + parseFloat(bp.left), rr = bb.right - parseFloat(bp.right);
        return Math.abs(l) < 3 && Math.abs(rr - innerWidth) < 3;
      })(),
      // Hydration.
      hydrated: (() => { const e = q('[aria-label^="Theme:"] span'); return e && getComputedStyle(e).opacity === "1"; })(),
      cardGrid: document.querySelectorAll("#hall ul.grid > li").length,
    };
  });

  console.log(`\n  === ${name} ===`);
  const line = (k, v, ok) => { if (ok === false) failures++; console.log(`    ${ok === false ? "FAIL" : ok === true ? "ok  " : "    "} ${k.padEnd(18)} ${v}`); };
  line("hydrated", r.hydrated, r.hydrated);
  line("fonts", `${r.display} / ${r.body}`, !/fallback|system-ui/i.test(r.display + r.body));
  line("nav plate", r.plate ?? "(none)", !!r.plate && r.plate.includes("saturate"));
  line("token alpha", r.tokenAlpha, r.tokenAlpha !== "rgba(0, 0, 0, 0)");
  line("container queries", r.cqSupported, r.cqSupported);
  line("monogram size", r.monogramFont ?? "n/a", r.monogramFont ? parseFloat(r.monogramFont) > 40 : null);
  line("lh unit", r.lhSupported, r.lhSupported);
  line("card name box", r.nameBox ? `${r.nameBox.w}x${r.nameBox.h}` : "n/a", r.nameBox ? r.nameBox.h >= 24 : null);
  line("color-mix", r.colorMix, r.colorMix);
  line("text-wrap balance", r.balance, null);
  line("band full-bleed", r.bandOk, r.bandOk);
  line("cards rendered", r.cardGrid, r.cardGrid === 14);
  if (errs.length) { failures++; console.log(`    FAIL page errors: ${errs.slice(0,2).join(" | ")}`); }
  await b.close();
}
console.log(`\n  ${failures} failure(s) across three engines`);
if (failures) process.exitCode = 1;
