// Cross-engine check. Everything until now ran in Chromium — Playwright's default
// and the engine behind the Chrome extension — so Safari and Firefox were entirely
// unverified. Safari matters most: it is the majority of mobile traffic in India,
// and this design leans on several features with real engine differences.
//
// Each assertion targets a specific feature that could plausibly differ, and every
// one is MEASURED, not inferred from a support table.
//
// UPDATED FOR THE MULTI-PAGE SITE, and the previous version is worth recording as a
// warning: it probed `#hall [role="img"] span` and `#hall h3` on the HOME page and
// asserted `cardGrid === 14`. After the redesign `#hall` does not exist on any route
// and the grid lives on /hall-of-fame — so every one of those selectors returned
// null, the monogram and card-name checks printed "n/a" with a null verdict, and the
// only hard assertion left compared 0 against 14. A cross-engine audit that measures
// nothing while printing a tidy table is worse than no audit, because it is trusted.
// Selectors that can go stale are now paired with the route that owns them, and the
// card count is derived rather than hardcoded to a number from a scaffold array.
import { chromium, webkit, firefox } from "playwright";
import { ROUTES, SITE, assertOurSite } from "./assert-site.mjs";

const BASE = SITE.replace(/\/$/, "");
/** The route that owns the portrait grid. Named once. */
const HALL = "/hall-of-fame";

const ENGINES = { chromium, webkit, firefox };
let failures = 0;

// WEBKIT + A PRODUCTION BUILD + PLAIN HTTP = FIVE FAILURES THAT ARE NOT BUGS.
//
// The production CSP carries `upgrade-insecure-requests` (see next.config.js). WebKit
// honours it on localhost where Chromium and Firefox exempt it, so over http every
// same-origin asset is upgraded to https://localhost, hits a TLS error, and WebKit
// gets no CSS, no fonts and no JavaScript — the page is blank, and `hydrated`,
// `nav plate`, `token alpha` and `band full-bleed` all fail at once.
//
// That is why CI points this suite at `next dev`, which omits the directive
// deliberately; all three engines pass there. Detected and explained here rather than
// left as a mystery, because the signature looks like catastrophic breakage and costs
// an hour to re-derive. Verified: dev sends the directive 0 times, production sends it.
async function upgradeInsecureOverHttp(url) {
  if (url.startsWith("https://")) return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return (res.headers.get("content-security-policy") ?? "").includes(
      "upgrade-insecure-requests",
    );
  } catch {
    return false;
  }
}
const CSP_TRAP = await upgradeInsecureOverHttp(BASE);
if (CSP_TRAP) {
  console.log(
    `\n  NOTE: ${BASE} sends upgrade-insecure-requests over plain http.\n` +
      `  WebKit honours that on localhost, so it receives no CSS, fonts or JS and\n` +
      `  several checks below fail for that reason alone. This is the documented\n` +
      `  behaviour of the production CSP, not a site defect — point this script at\n` +
      `  \`next dev\` (as CI does) or at an https origin for a meaningful WebKit result.\n` +
      `  WebKit failures are reported as warn and NOT counted while this holds.`,
  );
}

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
      //
      // Measured on `.nav-plate`, not on `header`. `header` is now only the fixed
      // positioning wrapper (`fixed inset-x-0 top-3`) and is deliberately
      // transparent; the plate — blur, saturate and the token background — moved to
      // the `nav` inside it. Probing `header` reported `none` / `rgba(0, 0, 0, 0)`
      // in all three engines, which reads as "the palette collapsed" when in fact
      // the plate was one element further in.
      plate: cs(".nav-plate", "backdropFilter") || cs(".nav-plate", "webkitBackdropFilter"),
      // rgb(var(--x) / a): the token format the whole palette depends on.
      tokenAlpha: cs(".nav-plate", "backgroundColor"),
      // Container queries, which size the monogram initials.
      cqSupported: CSS.supports("container-type", "inline-size"),
      // The `lh` unit, added for the card name min-height. Newer than the rest.
      lhSupported: CSS.supports("min-height", "2lh"),
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
      // mask-image, which carries the nav's scroll affordance below md. WebKit
      // wanted -webkit-mask-image for years and Tailwind's arbitrary value emits
      // only the unprefixed property, so if this is unsupported the fade silently
      // does not render and three of five nav links go back to being invisible on a
      // phone. Measured on the element that relies on it, at a width where it is
      // supposed to be active.
      maskSupported: CSS.supports("mask-image", "linear-gradient(#000, transparent)"),
    };
  });

  // Portrait grid checks, on the route that actually owns it.
  await pg.goto(BASE + HALL, { waitUntil: "networkidle" });
  await assertOurSite(pg);
  await pg.waitForTimeout(1200);
  const hall = await pg.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
    // `#hall`, not `#achievers`: the section was renamed and the grid moved into
    // components/hall/Hall.tsx. The old id matched nothing, so this reported zero
    // cards AND no panel — the exact "section silently vanished" signature the
    // invariant below exists to catch, produced by the check rather than the page.
    //
    // `[data-achiever]` rather than `ul > li`, because the grid also holds the
    // "Open spot" tile, which has no portrait by design and would fail the
    // every-card-has-a-portrait assertion forever.
    const cards = document.querySelectorAll("#hall [data-achiever]");
    return {
      monogramFont: (() => { const e = q('#hall [role="img"] span'); return e ? getComputedStyle(e).fontSize : null; })(),
      // Card names are h2 now, not h3.
      nameBox: box("#hall [data-achiever] h2"),
      cardGrid: cards.length,
      // An EMPTY grid is a legitimate production state — no member has consented yet,
      // so the section renders its honest empty panel instead. What must never happen
      // is neither: no cards AND no panel means the section silently vanished.
      //
      // Scoped to `.rounded-tile.border-dashed` — the empty panel in Hall.tsx. A bare
      // `.border-dashed` also matches the dashed "org TBA" chip and the open-spot
      // tile's dashed inner ring, both of which live INSIDE cards, so it would report
      // "panel shown" on a section that has cards and no panel at all.
      emptyPanel: !!q("#hall .rounded-tile.border-dashed"),
      // Internal consistency instead of a hardcoded count: every card must carry a
      // portrait (a real <img> or the monogram fallback) and a heading. This cannot
      // drift when the content array changes, which is what broke the old check.
      cardsWithPortrait: [...cards].filter((li) => li.querySelector('img, [role="img"]')).length,
      cardsWithHeading: [...cards].filter((li) => li.querySelector("h2")).length,
    };
  });

  // The nav fade, checked at a width where it must be active.
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(400);
  const fade = await pg.evaluate(() => {
    const ul = document.querySelector('nav[aria-label="Main"] ul');
    if (!ul) return null;
    const cs = getComputedStyle(ul);
    const mask = cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : cs.webkitMaskImage;
    return {
      scrollable: ul.scrollWidth > ul.clientWidth + 1,
      applied: !!mask && mask !== "none" && mask.includes("gradient"),
    };
  });
  await pg.setViewportSize({ width: 1440, height: 900 });

  console.log(`\n  === ${name} ===`);
  // WebKit results are printed but not counted while the CSP trap above applies —
  // otherwise a correct production build reports failures it cannot avoid, and a
  // suite that cries wolf gets ignored rather than fixed.
  const counts = !(CSP_TRAP && name === "webkit");
  const line = (k, v, ok) => {
    if (ok === false && counts) failures++;
    const mark = ok === false ? (counts ? "FAIL" : "warn") : ok === true ? "ok  " : "    ";
    console.log(`    ${mark} ${k.padEnd(18)} ${v}`);
  };
  line("hydrated", r.hydrated, r.hydrated);
  line("fonts", `${r.display} / ${r.body}`, !/fallback|system-ui/i.test(r.display + r.body));
  line("nav plate", r.plate ?? "(none)", !!r.plate && r.plate.includes("saturate"));
  line("token alpha", r.tokenAlpha, r.tokenAlpha !== "rgba(0, 0, 0, 0)");
  line("container queries", r.cqSupported, r.cqSupported);
  line("lh unit", r.lhSupported, r.lhSupported);
  line("mask-image", r.maskSupported, r.maskSupported);
  // These only mean something when there are cards to measure. Asserting them
  // unconditionally made this script report SIXTEEN failures against a correct
  // production build, purely because production has no consented achievers yet and
  // renders the empty panel instead. A check that fails on a legitimate state is
  // noise, and noisy checks get deleted rather than fixed — so the card-level
  // assertions are skipped when there is no card, and the invariant that DOES hold
  // in both environments is asserted instead, below.
  const haveCards = hall.cardGrid > 0;
  line("monogram size", haveCards ? hall.monogramFont ?? "MISSING" : "skipped (no cards)", haveCards ? (hall.monogramFont ? parseFloat(hall.monogramFont) > 40 : false) : null);
  line("card name box", haveCards ? (hall.nameBox ? `${hall.nameBox.w}x${hall.nameBox.h}` : "MISSING") : "skipped (no cards)", haveCards ? (hall.nameBox ? hall.nameBox.h >= 24 : false) : null);
  line("color-mix", r.colorMix, r.colorMix);
  line("text-wrap balance", r.balance, null);
  line("band full-bleed", r.bandOk, r.bandOk);
  // THE INVARIANT THAT HOLDS EVERYWHERE: the achievers section shows either complete
  // cards or the honest empty panel. Never nothing. This is true of the dev server
  // (scaffold cards) and of production (empty panel), so it can be asserted hard —
  // unlike a card count, which the old `=== 14` hardcoded from a scaffold array and
  // which fails on a correct production build.
  line(
    "achievers section",
    haveCards
      ? `${hall.cardGrid} cards — ${hall.cardsWithPortrait} portrait, ${hall.cardsWithHeading} heading`
      : `empty panel ${hall.emptyPanel ? "shown" : "MISSING"}`,
    haveCards
      ? hall.cardsWithPortrait === hall.cardGrid && hall.cardsWithHeading === hall.cardGrid
      : hall.emptyPanel,
  );
  line(
    "nav fade at 390px",
    fade ? `scrollable=${fade.scrollable} applied=${fade.applied}` : "MISSING",
    // Only meaningful while the strip actually overflows; if it does, the fade must
    // be there, because it is the only thing telling a phone user there are more
    // pages.
    fade ? !fade.scrollable || fade.applied : false,
  );
  if (errs.length) { if (counts) failures++; console.log(`    ${counts ? "FAIL" : "warn"} page errors: ${errs.slice(0,2).join(" | ")}`); }
  await b.close();
}
console.log(`\n  ${failures} failure(s) across three engines`);
if (failures) process.exitCode = 1;
