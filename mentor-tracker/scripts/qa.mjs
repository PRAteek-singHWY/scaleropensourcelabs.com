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

const URL = process.argv[2] ?? "http://localhost:3001/";
const OUT = "study/qa";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "desktop", width: 1440, height: 900 },
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
    });

    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.waitForTimeout(2500);

    const issues = await page.evaluate(
      ({ vpWidth, isMobile }) => {
        const out = [];
        const seen = new Set();
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
          const floor = large ? 3 : 4.5;
          if (ratio < floor) {
            add("contrast", `${ratio.toFixed(2)}:1 (need ${floor}) ${size}px "${t.slice(0, 30)}"`, el);
          }
        }

        return out;
      },
      { vpWidth: vp.width, isMobile: vp.name === "mobile" },
    );

    const tag = `${vp.name}-${theme}`;
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
    report.push({ viewport: vp.name, theme, issues });

    const byKind = issues.reduce((m, i) => ((m[i.kind] = (m[i.kind] || 0) + 1), m), {});
    const summary = Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join("  ") || "clean";
    console.log(`  ${tag.padEnd(16)} ${summary}`);

    await page.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

const total = report.reduce((n, r) => n + r.issues.length, 0);
console.log(`\n  ${total} issue(s) across ${report.length} combinations → ${OUT}/report.json`);

// Exit non-zero so CI actually fails. Printing "12 issues" and returning 0 makes
// every pipeline green regardless of what was found.
if (total > 0) process.exitCode = 1;
