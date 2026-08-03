// Visual QA sweep: every breakpoint × both themes, plus automated defect checks.
//
//   node scripts/qa.mjs [url]
//
// This exists because every single time I have actually looked at this site in a
// browser I have found a real bug — a headline overflowing the viewport, a rocket
// rendering behind the copy, a transition that never completed, a card sitting on
// its own subject. None of those were visible in the source.
//
// Mobile and light theme have never once been checked. That is where the defects
// will be.
//
// The automated checks below catch the things a screenshot won't show you:
// horizontal overflow, text smaller than 12px, tap targets under 44px, images
// without alt text, heading levels that skip, and contrast failures against the
// actual computed background.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

import { SITE, assertOurSite } from "./assert-site.mjs";
const URL = process.argv[2] ?? SITE;
const OUT = "study/qa";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 900 },
  // The outline panel is a whole UI surface — a frosted plate with fourteen links
  // — that only exists at lg+ and only when the reader opts in. Swept as its own
  // combination, because a panel nothing checks is a panel whose contrast and
  // target sizes are unknown.
  { name: "desktop+outline", width: 1440, height: 900, outline: true },
];
const THEMES = ["light", "dark"];

const browser = await chromium.launch();
const report = [];

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: vp.name === "mobile",
      hasTouch: vp.name === "mobile",
      // Measure the SETTLED page. Scroll reveals mean sections below the fold sit
      // at opacity 0 until observed, and a sweep that lands mid-fade could read
      // differently run to run. Reduced motion makes Reveal not participate at
      // all, so what is measured is what the reader ends up looking at.
      //
      // This does not lose coverage: computed colour and bounding boxes ignore an
      // ancestor's opacity, so the numbers were the same either way — 434 text
      // nodes measured in both. It buys determinism, not reach.
      reducedMotion: "reduce",
    });

    if (vp.outline) {
      await page.addInitScript(() => localStorage.setItem("osc-outline", "1"));
    }
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // Before measuring anything, confirm this is our site and not whatever else
    // happens to be listening. See assert-site.mjs for why.
    await assertOurSite(page);
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.waitForTimeout(2500);

    const result = await page.evaluate(
      ({ vpWidth, isMobile }) => {
        const out = [];
        const seen = new Set();
        // How many text nodes the contrast pass examined. Reported so a future
        // filter cannot quietly reduce the sweep to a handful of elements while
        // still printing "clean".
        let examined = 0;
        const add = (kind, detail, el) => {
          const key = `${kind}|${detail}`;
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ kind, detail, tag: el?.tagName?.toLowerCase() });
        };

        // 1. Horizontal overflow — the page body must never scroll sideways.
        if (document.documentElement.scrollWidth > vpWidth + 1) {
          add("overflow-page", `body scrollWidth ${document.documentElement.scrollWidth} > ${vpWidth}`);
          for (const el of document.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > vpWidth + 2 && !el.closest("[class*=overflow-x-auto]")) {
              add("overflow-el", `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)} right=${Math.round(r.right)}`, el);
              if (out.filter((o) => o.kind === "overflow-el").length > 4) break;
            }
          }
        }

        // 2. Text too small to read comfortably on a phone.
        for (const el of document.querySelectorAll("p,span,li,a,dd,dt,td,th")) {
          const t = (el.textContent || "").trim();
          if (!t || el.children.length) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size && size < 11) add("tiny-text", `${size}px "${t.slice(0, 34)}"`, el);
        }

        // 3. Tap targets. 44px is the accessibility floor for a touch device.
        if (isMobile) {
          for (const el of document.querySelectorAll("a,button,input,[role=button]")) {
            // A control wrapped in its own label is tapped anywhere on that
            // label, so the label is the real target. Measuring the 16px
            // checkbox reported a failure that a finger never encounters.
            const target = el.closest("label") || el;
            const r = target.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.height < 40) {
              add("small-tap", `${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || "").trim().slice(0, 24)}"`, el);
            }
          }
        }

        // 4. Images without alt.
        for (const img of document.querySelectorAll("img")) {
          if (!img.hasAttribute("alt")) add("img-no-alt", img.getAttribute("src")?.slice(0, 50) ?? "?", img);
        }

        // 5. Heading order. A skipped level breaks screen-reader navigation.
        let prev = 0;
        for (const h of document.querySelectorAll("h1,h2,h3,h4")) {
          const lvl = Number(h.tagName[1]);
          if (prev && lvl > prev + 1) {
            add("heading-skip", `h${prev} → h${lvl} at "${(h.textContent || "").trim().slice(0, 34)}"`, h);
          }
          prev = lvl;
        }

        // 6. Contrast, measured against the real composited background.
        const lum = (c) => {
          const [r, g, b] = c.map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const bgOf = (el) => {
          let n = el;
          while (n && n !== document.documentElement) {
            const bg = getComputedStyle(n).backgroundColor;
            const p = parse(bg);
            if (p.length === 3 && !bg.includes("rgba(0, 0, 0, 0)")) return p;
            n = n.parentElement;
          }
          return parse(getComputedStyle(document.body).backgroundColor);
        };
        for (const el of document.querySelectorAll("p,span,li,a,h1,h2,h3,dt,dd,td")) {
          const t = (el.textContent || "").trim();
          if (!t || el.children.length) continue;
          const cs = getComputedStyle(el);
          const fg = parse(cs.color);
          const bg = bgOf(el);
          if (fg.length < 3 || bg.length < 3) continue;
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const size = parseFloat(cs.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          examined++;
          const floor = large ? 3 : 4.5;
          if (ratio < floor) {
            add("contrast", `${ratio.toFixed(2)}:1 (need ${floor}) ${size}px "${t.slice(0, 30)}"`, el);
          }
        }

        return { out, examined };
      },
      { vpWidth: vp.width, isMobile: vp.name === "mobile" },
    );
    const issues = result.out;

    const tag = `${vp.name}-${theme}`;
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
    report.push({ viewport: vp.name, theme, examined: result.examined, issues });

    const byKind = issues.reduce((m, i) => ((m[i.kind] = (m[i.kind] || 0) + 1), m), {});
    const summary = Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join("  ") || "clean";
    console.log(`  ${tag.padEnd(16)} ${summary}`);

    await page.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Guard against a silent collapse in coverage. A sweep that examines four
// elements and finds nothing wrong also reports "0 issues"; this makes the
// difference visible. The floor is deliberately well below the ~434 currently
// examined, so it catches a collapse rather than tracking normal drift.
const FLOOR = 250;
const thin = report.filter((r) => (r.examined ?? Infinity) < FLOOR);
if (thin.length > 0) {
  console.log(
    `\n  !! coverage collapsed: ${thin
      .map((r) => `${r.viewport}-${r.theme} examined ${r.examined}`)
      .join(", ")} (floor ${FLOOR})`,
  );
}

const total = report.reduce((n, r) => n + r.issues.length, 0);
console.log(`\n  ${total} issue(s) across ${report.length} combinations → ${OUT}/report.json`);

// Exit non-zero so CI actually fails. Printing "12 issues" and returning 0 makes
// every pipeline green regardless of what was found.
if (total > 0 || thin.length > 0) process.exitCode = 1;
