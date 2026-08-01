// Visual + computed-style capture, via Playwright.
//
//   node scripts/study.mjs <url> <name> [--full]
//
// Replaces the browser-extension workflow: scriptable, reproducible, no
// permission prompts, and it returns MEASURED values rather than my impression of
// a screenshot. For each target it writes:
//
//   study/<name>-<scroll>.png   viewport shots down the page
//   study/<name>.json           computed styles for the elements that matter
//
// The JSON is the point. Reading a screenshot tells you a headline looks big;
// getComputedStyle tells you it is 80px/600/-1.2px, which is the thing you can
// actually implement. Every design claim I make from this should trace to a
// number in here.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const [, , url, name, ...flags] = process.argv;
if (!url || !name) {
  console.error("usage: node scripts/study.mjs <url> <name> [--full]");
  process.exit(1);
}
const full = flags.includes("--full");

const OUT = "study";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  // A real UA: some marketing sites serve a degraded page to headless defaults.
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});

console.log(`→ ${url}`);
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch(async () => {
  // networkidle never settles on pages with polling or video; domcontentloaded
  // plus a pause is enough to lay out and paint.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
});
await page.waitForTimeout(3500);

// Dismiss the usual consent overlays, which otherwise sit over every screenshot.
for (const sel of [
  'button:has-text("Accept")',
  'button:has-text("Agree")',
  'button:has-text("Got it")',
  '[aria-label*="close" i]',
]) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 400 })) await el.click({ timeout: 800 });
  } catch {
    /* nothing to dismiss */
  }
}

// ---- Measured styles ------------------------------------------------------

const data = await page.evaluate(() => {
  const cs = (el) => {
    if (!el) return null;
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 70),
      tag: el.tagName.toLowerCase(),
      font: c.fontFamily.split(",")[0].replace(/['"]/g, ""),
      size: c.fontSize,
      weight: c.fontWeight,
      tracking: c.letterSpacing,
      leading: c.lineHeight,
      colour: c.color,
      bg: c.backgroundColor,
      radius: c.borderRadius,
      pad: c.padding,
      shadow: c.boxShadow === "none" ? null : c.boxShadow,
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };

  const pick = (sel, n = 6) => [...document.querySelectorAll(sel)].slice(0, n).map(cs);

  // Vertical rhythm: the gaps between top-level sections are what make a page
  // feel expensive, and they are invisible in a screenshot.
  const sections = [...document.querySelectorAll("section, main > div")]
    .slice(0, 14)
    .map((el) => {
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        cls: (el.className || "").toString().slice(0, 60),
        h: Math.round(r.height),
        padTop: c.paddingTop,
        padBottom: c.paddingBottom,
        bg: c.backgroundColor,
      };
    });

  const body = getComputedStyle(document.body);
  return {
    url: location.href,
    title: document.title,
    page: {
      bg: body.backgroundColor,
      colour: body.color,
      font: body.fontFamily,
      scrollHeight: document.body.scrollHeight,
    },
    counts: {
      canvas: document.querySelectorAll("canvas").length,
      video: document.querySelectorAll("video").length,
      img: document.querySelectorAll("img").length,
      svg: document.querySelectorAll("svg").length,
      forms: document.querySelectorAll("form").length,
      inputs: document.querySelectorAll("input,select,textarea").length,
    },
    h1: pick("h1", 3),
    h2: pick("h2", 8),
    buttons: pick("button, a[class*=button], a[class*=btn], [role=button]", 8),
    cards: [...document.querySelectorAll("div,article,li")]
      .filter((el) => {
        const c = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          parseFloat(c.borderRadius) >= 4 &&
          r.width > 180 &&
          r.height > 120 &&
          (c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.boxShadow !== "none")
        );
      })
      .slice(0, 6)
      .map(cs),
    sections,
    // Verbatim copy: headline length and punctuation are measurable too.
    copy: [...document.querySelectorAll("h1,h2,h3")]
      .slice(0, 20)
      .map((el) => (el.textContent || "").trim().replace(/\s+/g, " "))
      .filter(Boolean),
  };
});

writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 2));

// ---- Screenshots ----------------------------------------------------------

const shots = [];
if (full) {
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
  shots.push(`${name}-full.png`);
} else {
  const vh = 900;
  const total = Math.min(data.page.scrollHeight, vh * 6);
  for (let y = 0; y < total; y += vh) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900); // let lazy images and reveals settle
    const f = `${name}-${String(y).padStart(5, "0")}.png`;
    await page.screenshot({ path: `${OUT}/${f}` });
    shots.push(f);
  }
}

await browser.close();

console.log(`  title      ${data.title}`);
console.log(`  page bg    ${data.page.bg}   text ${data.page.colour}`);
console.log(
  `  media      ${data.counts.canvas} canvas · ${data.counts.video} video · ${data.counts.img} img · ${data.counts.svg} svg`,
);
console.log(`  forms      ${data.counts.forms} form · ${data.counts.inputs} inputs`);
if (data.h1[0]) {
  const h = data.h1[0];
  console.log(`  h1         ${h.size} / ${h.weight} / ${h.tracking} — "${h.text}"`);
}
console.log(`  wrote      ${OUT}/${name}.json + ${shots.length} screenshot(s)`);
