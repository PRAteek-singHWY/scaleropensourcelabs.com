// The nav must be dark over the night sections and light over the page body, in
// light theme. Sample the rendered plate at both.
import { chromium } from "playwright";
import { PNG } from "pngjs";
const lum = ([r,g,b]) => { const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };

const b = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" })).newPage();
await pg.goto("http://localhost:3001", { waitUntil: "networkidle" });
await pg.waitForTimeout(2200);

const sample = async (label) => {
  const buf = await pg.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 44 } });
  const png = PNG.sync.read(buf);
  const at = (x, y) => { const i = (png.width * y + x) << 2; return [png.data[i], png.data[i+1], png.data[i+2]]; };
  const box = await pg.evaluate(() => { const r = document.querySelector("nav a").getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  const plate = at(box.x + box.w + 40, 22);
  let ink = plate;
  for (let y = box.y + 3; y < box.y + box.h - 3; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      const p = at(x, y);
      if (Math.abs(lum(p) - lum(plate)) > Math.abs(lum(ink) - lum(plate))) ink = p;
    }
  const r = ratio(ink, plate);
  console.log(`  ${label.padEnd(22)} plate rgb(${plate})  wordmark ${r.toFixed(2)}:1  ${r >= 4.5 ? "PASS" : "*** FAIL ***"}`);
};

await sample("over hero (night)");
const y = await pg.evaluate(() => document.querySelector("#programmes").offsetTop + 200);
await pg.evaluate((v) => scrollTo(0, v), y);
await pg.waitForTimeout(1200);
await sample("over programmes (day)");
const h = await pg.$("#hall");
await pg.evaluate((v) => scrollTo(0, v), (await h.evaluate((n) => n.offsetTop)) + 5000);
await pg.waitForTimeout(1400);
await sample("over hall (night)");
await pg.screenshot({ path: "study/light/final-navnight.png" });
await b.close();
