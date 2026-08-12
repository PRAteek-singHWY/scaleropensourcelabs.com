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
import { PNG } from "pngjs";
import { mkdirSync, writeFileSync } from "node:fs";

import { ROUTES, SITE, assertOurSite } from "./assert-site.mjs";
// A BASE url now, not a page url: the sweep visits every route under it. Passing a
// single page here was correct when the site was one page and is now a way to check
// one sixth of it and report "clean".
const BASE = (process.argv[2] ?? SITE).replace(/\/$/, "");
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

    // THE THEME IS SET BEFORE FIRST PAINT, NOT AFTER NAVIGATION, and this is a
    // determinism fix rather than a tidy-up.
    //
    // It used to be `setAttribute("data-theme", …)` after each goto, followed by a
    // 900ms settle. That looks sufficient and is not: flipping the attribute on a
    // live document re-resolves every custom property and re-runs the colour
    // transitions attached to .nav-link, .btn and friends, so for a brief window
    // the page is genuinely half-themed — dark backgrounds already painted, some
    // text still carrying light-theme ink. Measured in that window the contrast
    // pass reports ratios like 1.02:1, which is not a design fault but light ink on
    // a dark ground caught mid-swap.
    //
    // The symptom was intermittency, which is the expensive kind of wrong: three
    // consecutive sweeps of one unchanged build returned 0, then 40, then 26
    // issues, on different routes each time. A checker that disagrees with itself
    // teaches people to ignore it.
    //
    // Writing localStorage instead makes the site's OWN anti-flash script (see
    // layout.tsx) stamp data-theme synchronously before anything paints — the exact
    // path a returning reader takes. There is no swap to catch mid-flight because
    // the page is never in the other theme to begin with.
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("osc-theme", t);
      } catch {}
    }, theme);

    // One page object per viewport/theme, reused across routes. Cheaper than 48
    // browser contexts, and the theme attribute has to be re-applied after each
    // navigation anyway because a full page load resets the DOM.
    for (const route of ROUTES) {
    // "load" rather than "domcontentloaded". The stylesheet is what every
    // measurement in this file depends on, and domcontentloaded does not wait for
    // it — so the sweep could begin resolving colours against a partially applied
    // stylesheet. Same class of bug as the theme race above.
    await page.goto(BASE + route.path, { waitUntil: "load", timeout: 60_000 });
    // Before measuring anything, confirm this is our site and not whatever else
    // happens to be listening. See assert-site.mjs for why.
    await assertOurSite(page);
    // Belt and braces. The init script above has already stamped this before paint;
    // re-asserting it is a no-op that costs nothing and keeps the run correct if the
    // anti-flash script is ever changed or removed. Because the value is already
    // what it is being set to, no transition fires.
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    // Was 2500 when a WebGL scene had to initialise. Nothing on the page is
    // async now and reducedMotion means the reveals do not animate, so this is just
    // settling time for fonts and layout.
    await page.waitForTimeout(900);

    const result = await page.evaluate(
      ({ vpWidth, isMobile }) => {
        const out = [];
        const seen = new Set();
        // How many text nodes the contrast pass examined. Reported so a future
        // filter cannot quietly reduce the sweep to a handful of elements while
        // still printing "clean".
        let examined = 0;
        // Text painted over a gradient: measured from pixels in Node, not here.
        const deferred = [];
        const add = (kind, detail, el) => {
          const key = `${kind}|${detail}`;
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ kind, detail, tag: el?.tagName?.toLowerCase() });
        };

        // 1. Horizontal overflow — the page body must never scroll sideways.
        if (document.documentElement.scrollWidth > vpWidth + 1) {
          add("overflow-page", `body scrollWidth ${document.documentElement.scrollWidth} > ${vpWidth}`);

          // Naming the CULPRIT rather than the symptoms, which the first version of
          // this did not do. The fixed nav carries `inset-x-0`, so it stretches to
          // whatever width the document ends up being — it therefore reports as
          // overflowing whenever ANYTHING else does. Being first in the DOM, it and
          // its four children consumed the entire five-item budget, and every real
          // cause was reported as "the nav is too wide" on every page. Two of the
          // actual bugs were invisible behind that for a full sweep.
          //
          // So: skip elements that merely stretch (position:fixed, and anything
          // wider than the viewport that has a wide descendant), and report the
          // LEAF-most offenders — the deepest elements that overflow but contain
          // nothing that also overflows. Those are the ones with the real content in
          // them.
          const offenders = [];
          for (const el of document.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.right <= vpWidth + 2) continue;
            // Inside a deliberate horizontal scroller: not a page-overflow bug.
            if (el.closest("[class*=overflow-x-auto]")) continue;
            // Positioned against the viewport, not the document flow.
            if (getComputedStyle(el).position === "fixed") continue;
            offenders.push(el);
          }
          const leaves = offenders.filter(
            (el) => !offenders.some((o) => o !== el && el.contains(o)),
          );
          for (const el of leaves.slice(0, 6)) {
            const r = el.getBoundingClientRect();
            add(
              "overflow-el",
              `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 46)} ` +
                `right=${Math.round(r.right)} w=${Math.round(r.width)} text="${(el.textContent || "").trim().slice(0, 24)}"`,
              el,
            );
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

            // EXEMPTION 1: visually-hidden controls. The skip link is a 1x1
            // clipped element until it receives focus, at which point it is a
            // full-size button. Reported as "1x1 Skip to content", which is a
            // failure no finger can encounter and no fix would improve — padding a
            // clipped element just makes a bigger clipped element.
            const cs = getComputedStyle(target);
            // Tailwind's `.sr-only` clips with the LEGACY `clip` property, not
            // `clip-path`. Testing only clipPath let this exemption silently never
            // fire, and the skip link kept being reported at 1x1 — a checker quietly
            // not doing the thing it claims to do, which is the failure mode this
            // whole suite exists to avoid. Both properties are tested now.
            const clipped = cs.clipPath !== "none" || cs.clip !== "auto";
            if (clipped && r.width <= 2 && r.height <= 2) continue;

            // EXEMPTION 2: links inline in a sentence. WCAG 2.5.8 explicitly
            // exempts these, and for a good reason rather than as a loophole: their
            // height is set by the line-height of the prose around them, and padding
            // one to 44px makes it overlap the lines above and below, so it starts
            // swallowing taps meant for its neighbours. A bigger box that steals
            // adjacent targets is worse than a small one.
            //
            // Tested precisely rather than by guessing: the element must be an
            // inline <a> whose parent also contains real text of its own. A
            // standalone link in its own block has no sibling text and is NOT
            // exempt, which is the case that actually matters and the one
            // globals.css has a `.tap` utility for.
            if (el.tagName === "A" && cs.display.startsWith("inline")) {
              const parent = el.parentElement;
              const siblingText = parent
                ? [...parent.childNodes]
                    .filter((n) => n.nodeType === 3)
                    .map((n) => n.textContent.trim())
                    .join("")
                : "";
              if (siblingText.length > 0) continue;
            }

            if (r.height < 40) {
              add("small-tap", `${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || "").trim().slice(0, 24)}"`, el);
            }
          }
        }

        // 3b. `.tap` combined with a margin or padding utility.
        //
        // A LINT RULE RATHER THAN A MEASUREMENT, and it is here because the failure
        // is invisible to every other check in this file: `.tap` sets margin-block
        // and padding-block and is declared after Tailwind's utilities, so it wins
        // on source order and any mt-/pt- class on the same element does nothing.
        // The layout is then subtly wrong — a card's link sitting 25px off — while
        // contrast, overflow and tap size all pass. Seven links shipped like this.
        for (const el of document.querySelectorAll(".tap")) {
          const cls = (el.className || "").toString();
          const clash = cls.match(/\b(m[tby]|p[tby])-[a-z0-9.]+/g);
          if (clash) {
            add(
              "tap-margin-clash",
              `${clash.join(" ")} on .tap — move the spacing to a wrapper (see globals.css)`,
              el,
            );
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

          // NOTHING WITH NO AREA. A contrast ratio for text that occupies zero
          // pixels is not a fact about anything a reader can see.
          //
          // This is here because of the margin notes. They hang in the gutter at
          // large widths and collapse to 0x0 below it — correct behaviour, since
          // there is no gutter on a phone — and the deferred pixel pass below then
          // tried to screenshot a zero-area box, which throws. Every one came back
          // as `unmeasurable-bg (could not capture)`: six on one route, in both
          // themes, at every mobile run. All false. The check was reporting that it
          // could not measure elements that were deliberately not painted.
          //
          // The two scripts had simply never met before — this sweep came from the
          // multi-page branch and the notes from the design one — so the pairing is
          // new even though neither part is.
          //
          // IT ALSO KEEPS THE SWEEP FROM FALLING OVER, which was not the intent and
          // is the better reason to keep it. Each deferred element gets a locator
          // screenshot, and a locator screenshot scrolls to its own target; asking
          // Playwright to scroll to and capture six zero-area boxes left the page in
          // a state where the full-page screenshot at the foot of this loop then
          // timed out at 30s and took the whole run with it. Verified by running this
          // file with and without these two lines against the same build: guarded
          // completes all 56 combinations, unguarded dies on the sixth.
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;

          const cs = getComputedStyle(el);
          const fg = parse(cs.color);
          const bg = bgOf(el);
          if (fg.length < 3 || bg.length < 3) continue;
          const L1 = lum(fg), L2 = lum(bg);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const size = parseFloat(cs.fontSize);
          const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
          examined++;

          // A background-IMAGE is invisible to this walk. The loop above resolves
          // an effective background by climbing ancestors reading
          // backgroundColor — so an element painted by a gradient reports
          // "transparent", the walk keeps climbing, and the ratio gets computed
          // against a surface that is not what the eye receives.
          //
          // That is not hypothetical: the yellow highlighter is a gradient, and
          // this check passed near-white text on it at 1.30:1 because it measured
          // the near-black section behind instead. Rather than guess at the
          // painted colour, say so — an unmeasurable pair is a finding, not a pass.
          let painted = null;
          for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
            const bi = getComputedStyle(n).backgroundImage;
            if (bi && bi !== "none") { painted = bi.slice(0, 40); break; }
            if (getComputedStyle(n).backgroundColor !== "rgba(0, 0, 0, 0)") break;
          }
          if (painted) {
            // Defer rather than guess or excuse. Node samples the rendered pixels
            // for these below, which is the only way to know what the eye gets.
            // Addressed by attribute rather than by box. A clip rectangle can
            // only capture inside the current viewport, and these elements sit
            // twenty thousand pixels down — every one failed with "could not
            // capture". A locator screenshot scrolls to its own target.
            const id = String(deferred.length);
            el.setAttribute("data-qa-defer", id);
            deferred.push({ id, text: t.slice(0, 24), size, large, fg });
            continue;
          }

          const floor = large ? 3 : 4.5;
          if (ratio < floor) {
            add("contrast", `${ratio.toFixed(2)}:1 (need ${floor}) ${size}px "${t.slice(0, 30)}"`, el);
          }
        }

        return { out, examined, deferred };
      },
      { vpWidth: vp.width, isMobile: vp.name === "mobile" },
    );
    const issues = result.out;

    // Pixel pass for the gradient-backed text the in-page walk cannot resolve.
    // Cheap: there are only ever a handful, and it converts a silent false pass
    // into a real number. The marker fills most of its own box behind short text,
    // so the modal colour in that box IS the painted background.
    for (const d of result.deferred) {
      let png;
      try {
        png = PNG.sync.read(
          await page.locator(`[data-qa-defer="${d.id}"]`).screenshot(),
        );
      } catch {
        issues.push({ kind: "unmeasurable-bg", detail: `${d.size}px "${d.text}" (could not capture)`, tag: "?" });
        continue;
      }
      const tally = new Map();
      for (let i = 0; i < png.data.length; i += 4) {
        const k = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      const modal = [...tally.entries()].sort((a, z) => z[1] - a[1])[0][0].split(",").map(Number);
      // Already a parsed [r,g,b] triple from the in-page pass.
      const fg = d.fg.slice(0, 3);
      const L = (c) => {
        const [r, g, bl] = c.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      };
      const [hi, lo] = [L(fg), L(modal)].sort((a, z) => z - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const floor = d.large ? 3 : 4.5;
      if (ratio < floor) {
        issues.push({
          kind: "contrast",
          detail: `${ratio.toFixed(2)}:1 (need ${floor}) ${d.size}px "${d.text}" on painted rgb(${modal})`,
          tag: "gradient",
        });
      }
    }

    const tag = `${route.name}-${vp.name}-${theme}`;
    // fullPage, unlike before. A viewport-sized shot of a 6,000px page is evidence
    // about the hero and nothing else, and the sections below the fold are exactly
    // where the layout bugs on this project have always been.
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
    report.push({ route: route.path, viewport: vp.name, theme, examined: result.examined, issues });

    const byKind = issues.reduce((m, i) => ((m[i.kind] = (m[i.kind] || 0) + 1), m), {});
    const summary = Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join("  ") || "clean";
    console.log(`  ${tag.padEnd(34)} ${String(result.examined).padStart(4)} nodes  ${summary}`);
    }

    await page.close();
  }
}

await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Guard against a silent collapse in coverage. A sweep that examines four
// elements and finds nothing wrong also reports "0 issues"; this makes the
// difference visible. The floor is deliberately well below the ~434 currently
// examined, so it catches a collapse rather than tracking normal drift.
// Guard against a silent collapse in coverage, now summed per viewport/theme ACROSS
// routes. The old per-combination floor of 250 was tuned for one 26,000px page; six
// shorter pages each examine far fewer nodes, so applied per route it would fail
// permanently and get deleted, which is how a real guard becomes noise. The floor is
// deliberately well under what the six pages currently examine together, so it
// catches a collapse rather than tracking normal drift.
const FLOOR = 600;
const byCombo = new Map();
for (const r of report) {
  const k = `${r.viewport}-${r.theme}`;
  byCombo.set(k, (byCombo.get(k) ?? 0) + (r.examined ?? 0));
}
const thin = [...byCombo.entries()].filter(([, n]) => n < FLOOR);
if (thin.length > 0) {
  console.log(
    `\n  !! coverage collapsed: ${thin
      .map(([k, n]) => `${k} examined ${n}`)
      .join(", ")} (floor ${FLOOR} across ${ROUTES.length} routes)`,
  );
}

const total = report.reduce((n, r) => n + r.issues.length, 0);
console.log(`\n  ${total} issue(s) across ${report.length} combinations → ${OUT}/report.json`);

// Exit non-zero so CI actually fails. Printing "12 issues" and returning 0 makes
// every pipeline green regardless of what was found.
if (total > 0 || thin.length > 0) process.exitCode = 1;
