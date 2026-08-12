// Palette validator.
//
//   node scripts/palette.mjs            check the live system
//   node scripts/palette.mjs --legacy   re-check the retired per-programme hues
//
// This exists because club.ts used to carry a comment ASSERTING that the
// programme colours had been validated as a categorical palette. A comment is not
// a check: it cannot fail, so it stayed true-looking while a fifth programme was
// added in a hue that broke it, and nobody could tell. Run `--legacy` to see the
// numbers that retired that system.
//
// WHAT THE LIVE SYSTEM IS
//
// Programme identity is typographic — the programme's own name, which is also the
// only treatment we are entitled to use for somebody else's trademark. Colour
// carries exactly one bit: whether the programme pays and selects (`paid`) or is
// open to walk into (`open`). Two categories, so the separation problem that broke
// seven hues does not arise.
//
// A KNOWN LIMITATION OF THIS FILE, stated because it nearly fooled me. dE2000
// counts lightness as well as hue, so a "categorical separation" floor can be
// satisfied by making one swatch darker rather than a different colour. A greedy
// search under these constraints cheerfully returned twenty passing colours that
// were all near-black. Separation numbers below are therefore necessary and not
// sufficient: for anything above two categories, look at the swatches.

const LEGACY = process.argv.includes("--legacy");

const THEMES = {
  light: {
    bg: "#FFFFFF",
    // The two tier tones, and every token used as TEXT on this ground. Values
    // mirror the custom properties in app/globals.css; if they drift, this file is
    // wrong and the fix is here, not there.
    tiers: { paid: "#0038FF", open: "#4A4A52" },
    text: { ink: "#111111", haze: "#4A4A52", dust: "#6A6A72", accent: "#0038FF", ember: "#B4551A" },
    // Yellow is a FILL on light, never text: #FFD600 on white is 1.41:1. Checked
    // in the direction it is actually used — ink sitting on the yellow.
    onPop: { pop: "#FFD600", over: "#111111" },
    legacy: {
      GSOC: "#1148D0",
      LFX: "#77225D",
      C4GT: "#03817D",
      SOB: "#B35605",
      OUTREACHY: "#6B3FBF",
    },
  },
  dark: {
    bg: "#0B0D14",
    tiers: { paid: "#5C82FF", open: "#9CA2B2" },
    text: { ink: "#F4F5FA", haze: "#9CA2B2", dust: "#82899A", accent: "#5C82FF", ember: "#FF8A3D" },
    onPop: { pop: "#FFD600", over: "#111111" },
    legacy: {
      GSOC: "#4A86E8",
      LFX: "#D64FA0",
      C4GT: "#1F9D6B",
      SOB: "#B8871F",
      OUTREACHY: "#8B6DE8",
    },
  },
};

// ---------------------------------------------------------------------------
// Colour maths.

const hex = (s) => {
  const h = s.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const toLinear = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const fromLinear = (v) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
};

const relLum = ([r, g, b]) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** sRGB -> CIE L*a*b* under D65. */
function lab([r, g, b]) {
  const [R, G, B] = [toLinear(r), toLinear(g), toLinear(b)];
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000. CIE76 badly overstates blue-region differences, which is exactly
    where most of these colours live. */
function dE2000(c1, c2) {
  const [L1, a1, b1] = lab(c1);
  const [L2, a2, b2] = lab(c2);
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const ap1 = a1 * (1 + G);
  const ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const deg = (r) => (r * 180) / Math.PI;
  const rad = (d) => (d * Math.PI) / 180;
  const hpf = (ap, bp) => {
    if (ap === 0 && bp === 0) return 0;
    const h = deg(Math.atan2(bp, ap));
    return h >= 0 ? h : h + 360;
  };
  const hp1 = hpf(ap1, b1);
  const hp2 = hpf(ap2, b2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh;
  if (Cp1 * Cp2 === 0) dh = 0;
  else if (Math.abs(hp2 - hp1) <= 180) dh = hp2 - hp1;
  else dh = hp2 - hp1 > 180 ? hp2 - hp1 - 360 : hp2 - hp1 + 360;
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(rad(dh) / 2);
  const Lb = (L1 + L2) / 2;
  const Cpb = (Cp1 + Cp2) / 2;
  let Hb;
  if (Cp1 * Cp2 === 0) Hb = hp1 + hp2;
  else if (Math.abs(hp1 - hp2) <= 180) Hb = (hp1 + hp2) / 2;
  else Hb = hp1 + hp2 < 360 ? (hp1 + hp2 + 360) / 2 : (hp1 + hp2 - 360) / 2;
  const T =
    1 -
    0.17 * Math.cos(rad(Hb - 30)) +
    0.24 * Math.cos(rad(2 * Hb)) +
    0.32 * Math.cos(rad(3 * Hb + 6)) -
    0.2 * Math.cos(rad(4 * Hb - 63));
  const dTh = 30 * Math.exp(-Math.pow((Hb - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cpb, 7) / (Math.pow(Cpb, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2));
  const Sc = 1 + 0.045 * Cpb;
  const Sh = 1 + 0.015 * Cpb * T;
  const Rt = -Math.sin(rad(2 * dTh)) * Rc;
  return Math.sqrt(
    Math.pow(dL / Sl, 2) +
      Math.pow(dC / Sc, 2) +
      Math.pow(dH / Sh, 2) +
      Rt * (dC / Sc) * (dH / Sh),
  );
}

/* Viénot, Brettel & Mollon (1999): simulate dichromacy by projecting linear RGB
   onto each dichromat's plane of confusion. The published sRGB compositions. */
const CVD = {
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  protanopia: [
    [0.1115, 0.8885, 0.0],
    [0.1115, 0.8885, 0.0],
    [0.0, 0.4712, 0.5288],
  ],
};

function simulate(rgb, kind) {
  const m = CVD[kind];
  const [R, G, B] = rgb.map(toLinear);
  return [
    m[0][0] * R + m[0][1] * G + m[0][2] * B,
    m[1][0] * R + m[1][1] * G + m[1][2] * B,
    m[2][0] * R + m[2][1] * G + m[2][2] * B,
  ].map(fromLinear);
}

// ---------------------------------------------------------------------------

const MIN_CONTRAST = 4.5;
const MIN_DE_NORMAL = 15;
const MIN_DE_CVD = 6;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};

for (const [themeName, theme] of Object.entries(THEMES)) {
  const bg = hex(theme.bg);
  console.log(`\n${themeName} — ground ${theme.bg}`);

  if (LEGACY) {
    // The retired per-programme set, kept runnable so the reason it was retired
    // stays reproducible rather than becoming folklore in a comment.
    const entries = Object.entries(theme.legacy).map(([k, v]) => [k, hex(v)]);
    for (const [mode, transform, floor] of [
      ["normal", (c) => c, MIN_DE_NORMAL],
      ...Object.keys(CVD).map((k) => [k, (c) => simulate(c, k), MIN_DE_CVD]),
    ]) {
      let worst = Infinity;
      let pair = "";
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const d = dE2000(transform(entries[i][1]), transform(entries[j][1]));
          if (d < worst) {
            worst = d;
            pair = `${entries[i][0]}/${entries[j][0]}`;
          }
          if (d < floor) {
            fail(`legacy ${mode}: ${entries[i][0]}/${entries[j][0]} dE ${d.toFixed(1)} (need ${floor})`);
          }
        }
      }
      console.log(`  legacy ${mode.padEnd(14)} worst dE ${worst.toFixed(1)} (${pair})  floor ${floor}`);
    }
    continue;
  }

  // 1. Every token used as text must clear 4.5:1 on its own ground. These are used
  //    at 11-17px, so the 3:1 large-text allowance does not apply to any of them.
  for (const [name, value] of Object.entries(theme.text)) {
    const r = contrast(hex(value), bg);
    const mark = r < MIN_CONTRAST ? "FAIL" : " ok ";
    if (r < MIN_CONTRAST) fail(`${name} ${value} is ${r.toFixed(2)}:1 on ${theme.bg}`);
    else console.log(`  ${mark}  text ${name.padEnd(7)} ${value}  ${r.toFixed(2)}:1`);
  }

  // 2. Yellow is checked in the direction it is used — as a fill, with ink on top.
  const popRatio = contrast(hex(theme.onPop.over), hex(theme.onPop.pop));
  if (popRatio < MIN_CONTRAST) fail(`ink on pop is ${popRatio.toFixed(2)}:1`);
  else console.log(`   ok   ink on pop fill        ${popRatio.toFixed(2)}:1`);

  // 3. The two tier tones must be separable, including under both dichromacies.
  //    Blue against a desaturated neutral separates on chroma, which is the axis
  //    dichromacy leaves intact — unlike the blue/violet pair that broke the old
  //    system.
  const paid = hex(theme.tiers.paid);
  const open = hex(theme.tiers.open);
  for (const [mode, transform, floor] of [
    ["normal", (c) => c, MIN_DE_NORMAL],
    ...Object.keys(CVD).map((k) => [k, (c) => simulate(c, k), MIN_DE_CVD]),
  ]) {
    const d = dE2000(transform(paid), transform(open));
    if (d < floor) fail(`tier tones under ${mode}: dE ${d.toFixed(1)} (need ${floor})`);
    else console.log(`   ok   paid/open ${mode.padEnd(13)} dE ${d.toFixed(1)}  floor ${floor}`);
  }
}

if (LEGACY) {
  // Failure is the POINT of this mode — it is the reproduction of the bug that
  // retired the per-programme palette. Exiting non-zero would make a script whose
  // documented purpose is to fail look like a broken check, and would break any CI
  // job that ran it for the record.
  console.log(
    `\n  ${failures} failure(s) in the retired set — expected, and why it was retired.` +
      `\n  See the note at the top of content/programs.ts.`,
  );
} else {
  console.log(failures === 0 ? `\n  all constraints pass.` : `\n  ${failures} constraint failure(s).`);
  if (failures > 0) process.exitCode = 1;
}
