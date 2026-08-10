// The celebration: confetti plus a short chime, on the two moments that deserve
// one — a submitted application, and a click on the main call to action.
//
// THREE THINGS ARE DELIBERATE HERE AND EASY TO UNDO BY ACCIDENT.
//
// 1. canvas-confetti is loaded with a DYNAMIC IMPORT, at the moment of the first
//    burst, not at module scope. It is 7kB that only ever runs after a click, and
//    a static import would put it in the page's first-load bundle for every
//    reader including the ones who never press anything. It also touches
//    `document` on import, so a static import from a component that ever renders
//    on the server is a build-time crash waiting for someone to move a file.
//
// 2. REDUCED MOTION SUPPRESSES BOTH the confetti and the sound. The motion half is
//    obvious. The sound is a judgement call: prefers-reduced-motion is not a sound
//    preference and there is no standard one, but in practice the people who set
//    it are asking for less sensory load, and a surprise chime is exactly that. A
//    quiet page is a fine outcome; startling somebody is not.
//
// 3. The chime is SYNTHESISED, not a file. No asset to ship, no 404 to handle, no
//    format negotiation — and it can only ever play for ~120ms because that is
//    hard-coded into the envelope below. It also only ever runs inside a click
//    handler, so it can never trip an autoplay policy.
//
// Everything is wrapped so a failure is silent. A browser that refuses to build an
// AudioContext, or a blocked chunk fetch, must not take out the form submission
// this is decorating — the celebration is the least important thing on screen at
// the moment it fires.

/** The palette, in the page's own order of loudness: electric blue, the yellow,
    the merge-green, and the gradient's violet end. The lime that used to close
    this list went with the lime .chip — it belonged to no other surface once the
    badges turned blue, and four confetti colours where the page has three reads
    as one stray colour rather than as a fourth. */
const COLOURS = ["#0038FF", "#FFD600", "#10B981", "#6B21FF"];

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** A short two-note rise. Quiet on purpose — 0.06 gain, not 1. */
function chime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    // Two notes a fifth apart, 60ms each. A triangle rather than a sine reads as
    // "interface", and rather than a square it does not read as an error.
    [
      [880, 0],
      [1320, 0.06],
    ].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      // Ramped rather than switched: a gain that jumps to full produces an
      // audible click at the start of the note on most output devices.
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.06, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.07);
    });

    // Release the hardware. Chrome caps a document at ~6 contexts, and this can
    // fire on every CTA click, so leaking one per burst would eventually make the
    // chime stop working with no error anywhere.
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* No audio is a fine outcome. */
  }
}

export async function celebrate() {
  if (reducedMotion()) return;

  chime();

  try {
    const confetti = (await import("canvas-confetti")).default;

    // Glyph confetti: a tick and a merge arrow, rasterised by the library from
    // text. Guarded because shapeFromText arrived in canvas-confetti 1.6 — on an
    // older resolved version this is undefined, and the whole burst would throw
    // rather than degrade to plain confetti.
    const shapes =
      typeof confetti.shapeFromText === "function"
        ? [
            confetti.shapeFromText({ text: "✓", scalar: 2 }),
            confetti.shapeFromText({ text: "🔀", scalar: 2 }),
          ]
        : undefined;

    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 38,
      ticks: 140,
      // Just above the fold's midpoint. Dead-centre puts the burst behind the
      // dialog or the button that triggered it; 0.72 throws it up past the fold.
      origin: { y: 0.72 },
      colors: COLOURS,
      shapes,
      scalar: shapes ? 1.6 : 1,
      disableForReducedMotion: true,
    });
  } catch {
    /* The chunk failed to load. The click still did its real job. */
  }
}
