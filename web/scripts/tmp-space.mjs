// Where is this page actually empty?
//
// For each section, walk down in 24px rows and measure how far OCCUPIED pixels
// reach on the right. Occupied means text ink (Range rects, so a <p> holding one
// short chip does not blanket its whole row) AND any element that paints — a
// card fill, a border, a rule, an image — whether or not it has children.
//
// The children check matters and was wrong in the first version of this script:
// skipping every element with children skips exactly the cards, so a note placed
// in a reported "void" could land on a card's blank padding and float on top of
// it. Painted boxes are counted here regardless of depth.
import { chromium } from "playwright";
import { assertOurSite } from "./assert-site.mjs";

const URL = process.env.SITE_URL ?? "http://localhost:3101";
const WIDTHS = (process.env.W ?? "1024,1800").split(",").map(Number);
const MIN_VOID = Number(process.env.MIN ?? 230);
const MIN_RUN = Number(process.env.RUN ?? 200); // a note is ~180-260px tall

const b = await chromium.launch();
const perWidth = {};

for (const WIDTH of WIDTHS) {
  const pg = await (
    await b.newContext({ viewport: { width: WIDTH, height: 1000 }, reducedMotion: "reduce" })
  ).newPage();
  await pg.goto(URL, { waitUntil: "networkidle" });
  await assertOurSite(pg);
  await pg.waitForTimeout(500);

  perWidth[WIDTH] = await pg.evaluate(
    ({ MIN_VOID, MIN_RUN }) => {
      const out = {};
      for (const sec of document.querySelectorAll("section[id]")) {
        const s = sec.getBoundingClientRect();
        const secTop = s.top + window.scrollY;
        const rows = Math.ceil(s.height / 24);
        const right = new Array(rows).fill(0);

        const mark = (t) => {
          if (!t.width || !t.height) return;
          const y0 = Math.max(0, Math.floor((t.top + window.scrollY - secTop) / 24));
          const y1 = Math.min(rows - 1, Math.floor((t.bottom + window.scrollY - secTop) / 24));
          for (let i = y0; i <= y1; i++)
            right[i] = Math.max(right[i], t.right - s.left);
        };

        for (const el of sec.querySelectorAll("*")) {
          if (el.classList.contains("sticker") || el.classList.contains("note")) continue;
          if (el.closest(".sticker, .note")) continue;
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" || cs.visibility === "hidden" || cs.display === "none")
            continue;
          const r = el.getBoundingClientRect();

          // Anything that paints occupies its whole box, children or not.
          const paints =
            cs.backgroundImage !== "none" ||
            cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            parseFloat(cs.borderTopWidth) > 0 ||
            parseFloat(cs.borderLeftWidth) > 0 ||
            cs.boxShadow !== "none" ||
            el.matches("img,svg,video,canvas,input,select,textarea,hr");
          if (paints && r.width > 6 && r.height > 4) mark(r);

          // Text ink, for the elements that only carry glyphs.
          if (!el.children.length && el.textContent.trim()) {
            const range = document.createRange();
            range.selectNodeContents(el);
            for (const t of range.getClientRects()) mark(t);
          }
        }

        const runs = [];
        let start = null;
        for (let i = 0; i <= rows; i++) {
          const free = i < rows ? s.width - right[i] : 0;
          if (free >= MIN_VOID) {
            if (start === null) start = i;
          } else if (start !== null) {
            if ((i - start) * 24 >= MIN_RUN)
              runs.push({
                y0: start * 24,
                y1: i * 24,
                free: Math.round(Math.min(...right.slice(start, i).map((x) => s.width - x))),
              });
            start = null;
          }
        }
        if (runs.length) out[sec.id] = runs;
      }
      return out;
    },
    { MIN_VOID, MIN_RUN },
  );
  await pg.close();
}

// Only report a void that survives at EVERY width — anything else is a number
// that happens to work at the width somebody last looked at.
const [a, ...rest] = WIDTHS;
console.log(
  `\nVoids present at ALL of ${WIDTHS.join(", ")}px  (>=${MIN_VOID}px wide, >=${MIN_RUN}px tall)\n`,
);
for (const id of Object.keys(perWidth[a])) {
  const overlaps = [];
  for (const run of perWidth[a][id]) {
    let lo = run.y0;
    let hi = run.y1;
    let free = run.free;
    let ok = true;
    for (const w of rest) {
      const other = (perWidth[w][id] ?? []).find((r) => r.y0 < hi && r.y1 > lo);
      if (!other) {
        ok = false;
        break;
      }
      lo = Math.max(lo, other.y0);
      hi = Math.min(hi, other.y1);
      free = Math.min(free, other.free);
    }
    if (ok && hi - lo >= MIN_RUN) overlaps.push({ lo, hi, free });
  }
  if (overlaps.length) {
    console.log(`#${id}`);
    for (const o of overlaps)
      console.log(
        `    top-[${o.lo}px] .. ${o.hi}px   (${o.hi - o.lo}px tall, ${o.free}px free width)`,
      );
  }
}
await b.close();
