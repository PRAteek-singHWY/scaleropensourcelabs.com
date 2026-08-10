// Every pinned decoration — stickers and notes — against the TEXT INK and the
// painted boxes in its own section. Overlap is not overflow; nothing else in
// this repo measures it.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { assertOurSite } from "./assert-site.mjs";

const URL = process.env.SITE_URL ?? "http://localhost:3101";
const OUT = process.env.SHOT_DIR ?? "study/notes";
const SHOOT = new Set((process.env.SHOOT ?? "").split(",").filter(Boolean));
mkdirSync(OUT, { recursive: true });

// The default sweep, plus every width where a capped column wraps differently
// from its neighbours. 1100/1180/1230 are the band that caught a flow note
// sitting on #why-us's headline — its heading fills its 56rem cap at 1180 and
// stops 170px short of it at 1440, so a note anchored off the wide measurement
// was clear at every width in the old list and wrong between two of them. Any
// note whose horizontal position is derived from measured ink has to be checked
// across the odd widths, not the round ones.
//
// W=1024,1180 to narrow it while iterating on one note.
const SWEEP = (process.env.W ?? "1024,1100,1180,1230,1280,1330,1440,1600,1800,2200")
  .split(",")
  .map((w) => [Number(w), "light"]);

const b = await chromium.launch();
for (const [width, theme] of [...SWEEP, [1800, "dark"]]) {
  const ctx = await b.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
    colorScheme: theme,
    deviceScaleFactor: SHOOT.size ? 2 : 1,
  });
  const pg = await ctx.newPage();
  await pg.goto(URL, { waitUntil: "networkidle" });
  await assertOurSite(pg);
  await pg.emulateMedia({ colorScheme: theme });
  await pg.waitForTimeout(400);

  const res = await pg.evaluate(() => {
    const de = document.documentElement;
    const hits = [];
    const shots = [];
    const PAD = 4;

    for (const d of document.querySelectorAll(".sticker, .note")) {
      const r = d.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const kind = d.classList.contains("sticker") ? "sticker" : "note";
      const sec = d.closest("section");
      if (!sec) continue;
      shots.push({ id: sec.id, kind, y: r.top + window.scrollY, left: r.left });

      if (r.left < -1 || r.right > de.clientWidth + 1)
        hits.push(
          `${kind} #${sec.id} ESCAPES ${r.left.toFixed(1)}..${r.right.toFixed(1)} of ${de.clientWidth}`,
        );

      // Text wider than the paper it is written on.
      if (kind === "note") {
        const cs = getComputedStyle(d);
        const inner =
          r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        for (const line of d.querySelectorAll("p,li")) {
          const range = document.createRange();
          range.selectNodeContents(line);
          if (range.getBoundingClientRect().width - inner > 1)
            hits.push(`note #${sec.id} TEXT BLEEDS past its edge`);
        }
      }

      for (const el of sec.querySelectorAll("*")) {
        if (d.contains(el) || el.contains(d)) continue;
        if (el.closest(".sticker, .note")) continue;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.visibility === "hidden") continue;

        const boxes = [];
        // Painted boxes — cards, frames, rules — occupy their whole area.
        const t = el.getBoundingClientRect();
        const paints =
          cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          parseFloat(cs.borderTopWidth) > 0 ||
          el.matches("img,svg,video,canvas,input,select,textarea,hr");
        if (paints && t.width > 6 && t.height > 4) boxes.push(t);
        // Glyphs, for the leaves that only carry text.
        if (!el.children.length && el.textContent.trim()) {
          const range = document.createRange();
          range.selectNodeContents(el);
          boxes.push(...range.getClientRects());
        }

        for (const q of boxes) {
          if (!q.width || !q.height) continue;
          if (
            r.left - PAD < q.right &&
            r.right + PAD > q.left &&
            r.top - PAD < q.bottom &&
            r.bottom + PAD > q.top
          ) {
            hits.push(
              `${kind} #${sec.id} [${d.textContent.trim().slice(0, 18)}] OVER <${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 18)}> "${el.textContent.trim().slice(0, 22)}"`,
            );
            break;
          }
        }
      }
    }
    return { hits: [...new Set(hits)], shots, over: de.scrollWidth - de.clientWidth };
  });

  console.log(
    `\n${width}px ${theme} — ${res.shots.length} decorations, doc overflow ${res.over}px — ${res.hits.length ? res.hits.length + " PROBLEM(S)" : "✓ clear"}`,
  );
  for (const h of res.hits) console.log("   ✖", h);

  for (const s of res.shots) {
    if (!SHOOT.has(s.id)) continue;
    await pg.evaluate((y) => window.scrollTo(0, Math.max(0, y - 260)), s.y);
    await pg.waitForTimeout(300);
    await pg.screenshot({
      path: `${OUT}/${width}-${theme}-${s.id}-${s.kind}.png`,
      clip: {
        x: Math.max(0, s.left - 400),
        y: 60,
        width: Math.min(width - Math.max(0, s.left - 400), 1020),
        height: 560,
      },
    });
  }
  await ctx.close();
}
await b.close();
