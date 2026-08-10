// Where every note actually sits, expressed the way a call site is written:
// insets from its containing block, and the ink it is beside in the same y band.
import { chromium } from "playwright";

const URL = process.env.SITE_URL ?? "http://localhost:3101";
const WIDTHS = (process.env.W ?? "1024,1280,1440,1800,2200").split(",").map(Number);

const b = await chromium.launch();
for (const width of WIDTHS) {
  const ctx = await b.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
  });
  const pg = await ctx.newPage();
  await pg.goto(URL, { waitUntil: "networkidle" });
  await pg.waitForTimeout(400);
  await pg.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 25));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });

  const res = await pg.evaluate(() => {
    const list = [];
    for (const d of document.querySelectorAll(".note, .sticker")) {
      const outer = d.classList.contains("note") ? d.parentElement : d;
      const r = d.getBoundingClientRect();
      if (!r.width) continue;
      const sec = d.closest("section");
      const kind = d.classList.contains("note") ? "note" : "stkr";
      const top = r.top + window.scrollY;
      const bottom = r.bottom + window.scrollY;
      const cont = outer.offsetParent ?? outer.parentElement;
      const cb = cont.getBoundingClientRect();
      const cs0 = getComputedStyle(cont);
      const padL = parseFloat(cs0.paddingLeft);
      const padR = parseFloat(cs0.paddingRight);

      // Furthest right ink / painted box in this note's y band, and furthest
      // left, both as offsets from the containing block's left edge.
      let inkR = -1e9;
      let inkL = 1e9;
      let what = "";
      for (const el of sec.querySelectorAll("*")) {
        if (el.closest(".sticker, .note")) continue;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.visibility === "hidden") continue;
        const boxes = [];
        const t = el.getBoundingClientRect();
        const paints =
          cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          parseFloat(cs.borderTopWidth) > 0 ||
          el.matches("img,svg,video,canvas,input,select,textarea,hr");
        if (paints && t.width > 6 && t.height > 4) boxes.push([t, "box"]);
        if (!el.children.length && el.textContent.trim()) {
          const range = document.createRange();
          range.selectNodeContents(el);
          for (const q of range.getClientRects()) boxes.push([q, "ink"]);
        }
        for (const [q, tag] of boxes) {
          const qt = q.top + window.scrollY;
          const qb = q.bottom + window.scrollY;
          if (qt < bottom && qb > top) {
            if (q.right > inkR) {
              inkR = q.right;
              what = `${tag} <${el.tagName.toLowerCase()}> ${el.textContent.trim().slice(0, 18)}`;
            }
            if (q.left < inkL) inkL = q.left;
          }
        }
      }
      list.push({
        sec: sec.id || "(none)",
        kind,
        text: d.textContent.trim().slice(0, 20).replace(/\s+/g, " "),
        top: Math.round(top),
        h: Math.round(r.height),
        secTop: Math.round(sec.getBoundingClientRect().top + window.scrollY),
        secH: Math.round(sec.getBoundingClientRect().height),
        // insets from the containing block
        insetL: Math.round(r.left - cb.left),
        insetR: Math.round(cb.right - r.right),
        contW: Math.round(cb.width),
        pad: `${padL}/${padR}`,
        inkR: inkR < -1e8 ? null : Math.round(inkR - cb.left),
        inkL: inkL > 1e8 ? null : Math.round(inkL - cb.left),
        what,
      });
    }
    list.sort((a, b) => a.top - b.top);
    const clashes = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const gap = list[j].top - (list[i].top + list[i].h);
        if (gap < 40)
          clashes.push(
            `${gap < 0 ? "OVERLAP" : "close  "} ${gap}px  ${list[i].kind} #${list[i].sec} [${list[i].text}]  ⟷  ${list[j].kind} #${list[j].sec} [${list[j].text}]`,
          );
      }
    return { list, clashes };
  });

  console.log(`\n================ ${width}px ================`);
  for (const n of res.list)
    console.log(
      `${n.kind} #${n.sec.padEnd(11)} y ${String(n.top).padStart(6)} h${String(n.h).padStart(4)}  sec ${n.secTop}+${n.secH} (rel ${n.top - n.secTop})  insets L${String(n.insetL).padStart(5)} R${String(n.insetR).padStart(5)} of ${n.contW} pad ${n.pad}  ink ${n.inkL}..${n.inkR}  [${n.text}] <- ${n.what}`,
    );
  console.log(`--- pairs within 40px vertically (${res.clashes.length}) ---`);
  for (const c of res.clashes) console.log("  ", c);
  await ctx.close();
}
await b.close();
