// Does a note actually get stuck on, and does it stop owning its transform
// afterwards? Asserts the wiring in Reveal.tsx + the `note-stick` keyframes, and
// shoots three frames of one note so the gesture can be looked at.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { assertOurSite } from "./assert-site.mjs";

const URL = process.env.SITE_URL ?? "http://localhost:3101";
const OUT = process.env.SHOT_DIR ?? "study/stick";
// 1800 by default, the only width at which the gutter notes exist at all — at
// 1440 the six of them are display:none and an observer never fires for a box
// that is not there, which looks exactly like a broken effect.
const WIDTH = Number(process.env.W ?? 1800);
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const fails = [];

// ---- 1. Motion allowed: every note off-screen at load should stick on -------
const ctx = await b.newContext({ viewport: { width: WIDTH, height: 900 } });
const pg = await ctx.newPage();
await pg.goto(URL, { waitUntil: "networkidle" });
await assertOurSite(pg);
await pg.waitForTimeout(500);

const before = await pg.evaluate(() =>
  document.querySelectorAll(".note.is-stuck").length,
);
if (before !== 0) fails.push(`${before} notes were stuck on at load without being scrolled to`);

// Hidden notes are skipped rather than failed: a gutter note below 1760px has
// no box, so there is nothing for an observer to see.
const notes = await pg.evaluate(() =>
  Array.from(document.querySelectorAll(".note"))
    .map((n, i) => {
      n.dataset.stickIdx = String(i);
      return { i, y: n.getBoundingClientRect().top + window.scrollY, shown: !!n.offsetParent };
    })
    .filter((n) => n.shown),
);

for (const n of notes) {
  await pg.evaluate((y) => window.scrollTo(0, Math.max(0, y - 450)), n.y);
  await pg.waitForTimeout(250);
  const state = await pg.evaluate((i) => {
    const el = document.querySelector(`.note[data-stick-idx="${i}"]`);
    const cs = getComputedStyle(el);
    return {
      stuck: el.classList.contains("is-stuck"),
      name: cs.animationName,
      delay: cs.animationDelay,
      i: el.style.getPropertyValue("--stick-i"),
      text: el.textContent.trim().slice(0, 18),
    };
  }, n.i);
  if (!state.stuck) fails.push(`note [${state.text}] never got .is-stuck`);
  else if (state.name !== "note-stick")
    fails.push(`note [${state.text}] has animation-name ${state.name}`);
  console.log(
    `  ${state.stuck ? "✓" : "✖"} [${state.text.padEnd(18)}] anim ${state.name} delay ${state.delay} --stick-i "${state.i}"`,
  );
}

// ---- 2. The pose it settles to must be .note's own -------------------------
// The animation fills `backwards`, not `both`, so once it is done the transform
// belongs to the stylesheet again and the hover peel can win. If this reads as
// the keyframe's end state via an animation still in effect, hover is dead.
await pg.waitForTimeout(700);
const rest = await pg.evaluate(() => {
  const el = document.querySelector(".note.is-stuck");
  const cs = getComputedStyle(el);
  return { fill: cs.animationFillMode, shadow: cs.boxShadow };
});
if (rest.fill !== "backwards")
  fails.push(`animation-fill-mode is ${rest.fill}, not backwards — hover will lose to it`);
console.log(`\n  fill-mode ${rest.fill}; resting shadow ${rest.shadow}`);

// ---- 3. Three frames of one note, to look at -------------------------------
const shot = notes[Math.min(3, notes.length - 1)];
await pg.evaluate(() => window.scrollTo(0, 0));
await pg.waitForTimeout(300);
await pg.evaluate((y) => window.scrollTo(0, Math.max(0, y - 500)), shot.y);
for (const [i, wait] of [40, 120, 400].entries()) {
  await pg.waitForTimeout(i === 0 ? wait : wait - [40, 120, 400][i - 1]);
  await pg.screenshot({ path: `${OUT}/frame-${wait}ms.png` });
}

// ---- 4. Reduced motion: no class at all -----------------------------------
const ctx2 = await b.newContext({
  viewport: { width: WIDTH, height: 900 },
  reducedMotion: "reduce",
});
const pg2 = await ctx2.newPage();
await pg2.goto(URL, { waitUntil: "networkidle" });
await assertOurSite(pg2);
await pg2.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 800) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 20));
  }
});
await pg2.waitForTimeout(300);
const rm = await pg2.evaluate(() => ({
  stuck: document.querySelectorAll(".note.is-stuck").length,
  visible: Array.from(document.querySelectorAll(".note")).every(
    (n) => getComputedStyle(n).opacity === "1",
  ),
}));
if (rm.stuck) fails.push(`reduced motion still stuck ${rm.stuck} notes on`);
if (!rm.visible) fails.push("a note is not fully opaque under reduced motion");
console.log(`  reduced motion: ${rm.stuck} stuck, all opaque ${rm.visible}`);

console.log(fails.length ? `\n✖ ${fails.length} PROBLEM(S)` : "\n✓ all clear");
for (const f of fails) console.log("   ✖", f);
await b.close();
process.exit(fails.length ? 1 : 0);
