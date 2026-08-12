// The green wall — a GitHub-style contribution grid under the hall, with OPEN
// SOURCE burned into it in dark cells.
//
// THIS IS TEXTURE, AND IT IS BUILT SO IT CANNOT BE MISREAD AS DATA. That
// distinction is the only interesting thing about the component, so it is worth
// being explicit about how it is enforced:
//
//   * The word IS the disclaimer now, and it is a better one than the caption
//     that used to sit up there reading "decorative · not a real contribution
//     graph". Real activity does not spell things. A wall that reads OPEN SOURCE
//     admits in the graphic itself that somebody arranged these cells, so the old
//     caption was explaining a joke the picture already tells. The line in its
//     place is a reading instruction rather than a disclaimer — squinting drops
//     the faint texture out and leaves the dark cells, which is genuinely how the
//     word resolves fastest.
//
//   * It carries NO counts, NO month or weekday axis, NO legend and NO tooltip.
//     A grid of green squares is a visual idiom; it only becomes a chart when
//     something around it claims the squares mean something. Add a "1,204
//     contributions this year" caption and this stops being decoration and starts
//     being a figure nobody measured.
//
//   * It is NOT per-student. One wall under the whole grid reads as a section
//     motif; a strip behind each card would read as that person's activity, and
//     none of these fifteen has activity data recorded anywhere in this repo.
//
//   * The pattern is DETERMINISTIC, from a tiny integer hash rather than
//     Math.random(). Random would differ between the server render and the client
//     hydration — React would warn, and one of the two would be discarded and
//     repainted. It also means the wall looks the same on every load, which is
//     what a background texture should do.
//
// aria-hidden and role-free: there is nothing here to announce. The word is
// decoration, not content — the section around it says "open source" in real text
// several times over, so a screen reader loses nothing by never hearing about it.
// The caption stays inside the hidden subtree even though it is now the loudest
// thing in the block, and on purpose: "close your eyes 70%" is an instruction for
// looking at a picture, so it is meaningless to a reader who is not.

/* Deterministic, cheap, and good enough for texture. Not a hash function anyone
   should use for anything else. */
function level(i: number): number {
  const n = (i * 2654435761) % 4294967296;
  const v = (n >>> 13) % 100;
  // Weighted so most cells are empty or faint. An evenly-filled grid reads as a
  // solid block; the gaps are what make it look like a contribution wall.
  if (v > 92) return 4;
  if (v > 80) return 3;
  if (v > 62) return 2;
  if (v > 38) return 1;
  return 0;
}

/* Emerald at four steps plus an empty cell. Fixed values rather than tokens: the
   wall is the same green on both themes — it is a reference to one specific
   interface, and a theme-following contribution graph is not that interface. The
   empty cell is the one value that has to move, or it disappears into the page on
   one theme and glares on the other. */
const FILL = ["", "#A7F3D0", "#6EE7B7", "#34D399", "#10B981"];

/* One step past the end of the ramp, reserved for the lettering. The word has to
   survive being read through a field of noise, and the top of the ramp was not far
   enough from the middle of it to manage that — #10B981 against a scattering of
   #34D399 is a difference you have to look for. This is emerald-700, the same green
   the checkmarks on the criteria cards use, so it is a colour the page already
   speaks rather than a new one introduced for one graphic. */
const WORD_FILL = "#047857";

/** 7 rows, like the real thing. 52 columns is a year. */
const ROWS = 7;
const COLS = 52;

/* A 5-row bitmap font, hand-cut for this one string.

   PROPORTIONAL, not fixed-width, and that is the only reason the string fits.
   Eleven characters at a uniform 4 columns plus gaps needs 54 of the 52 columns
   available; letting E, P and C keep the narrow forms they want brings it to 47.

   Four columns is also the narrowest an N can be and still be an N — the diagonal
   needs two interior steps, and at three columns there is only one, which is why
   the 3-wide N in most tiny fonts is indistinguishable from an H. S has the same
   problem for the opposite reason: its two curves need somewhere to go. */
const GLYPHS: Record<string, string[]> = {
  O: [".##.", "#..#", "#..#", "#..#", ".##."],
  P: ["###", "#.#", "###", "#..", "#.."],
  E: ["###", "#..", "##.", "#..", "###"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  S: [".###", "#...", ".##.", "...#", "###."],
  U: ["#..#", "#..#", "#..#", "#..#", ".##."],
  R: ["###.", "#..#", "###.", "#.#.", "#..#"],
  C: [".###", "#...", "#...", "#...", ".###"],
};

const WORD = "OPEN SOURCE";
const GLYPH_ROWS = 5;
const LETTER_GAP = 1;
/* Two columns between the words rather than one. At this size a single blank
   column reads as the gap inside a letter, and "OPENSOURCE" is not the string. */
const WORD_GAP = 2;

/* Set the string once at module scope into a boolean grid the render just looks
   up. Composing rows of text and converting at the end — rather than blitting
   glyphs at computed offsets — means the horizontal metrics are counted by the
   same code that draws them, so the centring cannot disagree with the layout. */
function typeset(): boolean[][] {
  const lines = Array.from({ length: GLYPH_ROWS }, () => "");

  for (let k = 0; k < WORD.length; k++) {
    const ch = WORD[k];
    if (ch === " ") {
      for (let r = 0; r < GLYPH_ROWS; r++) lines[r] += ".".repeat(WORD_GAP);
      continue;
    }
    const glyph = GLYPHS[ch];
    for (let r = 0; r < GLYPH_ROWS; r++) lines[r] += glyph[r];

    // No letter gap where a word gap is about to supply one, and none trailing.
    const next = WORD[k + 1];
    if (next && next !== " ") {
      for (let r = 0; r < GLYPH_ROWS; r++) lines[r] += ".".repeat(LETTER_GAP);
    }
  }

  const grid: boolean[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => false),
  );
  // Centre horizontally; vertically there is exactly one spare row above and
  // below five rows of glyph in seven rows of wall, so the offset is 1.
  const x0 = Math.floor((COLS - lines[0].length) / 2);
  const y0 = Math.floor((ROWS - GLYPH_ROWS) / 2);

  for (let r = 0; r < GLYPH_ROWS; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      const x = x0 + c;
      if (x >= 0 && x < COLS) grid[y0 + r][x] = lines[r][c] === "#";
    }
  }
  return grid;
}

const MASK = typeset();

export default function ContribWall() {
  return (
    // A stagger group, which here is doing something other than staggering: the
    // wall needs the `.is-in` a group earns so its cells can fill in column by
    // column as it arrives — a year of contributions accumulating left to right,
    // which is the one gesture this graphic is a picture of. The cell delay is
    // per COLUMN rather than per cell, so 364 squares resolve in about 0.6s
    // instead of four and a half seconds. See .wall-cell in globals.css.
    <div aria-hidden className="mt-8 sm:mt-20" data-reveal-group>
      <div className="flex items-end justify-between gap-4">
        <p className="label">The wall</p>
        {/* Not a disclaimer any more — a hint. It tells you what to do with the
            graphic instead of telling you what it is not, and what it tells you
            actually works: lose the detail and the dark cells are all that is
            left.

            A CHIP rather than the 11px mono grey it started as. That treatment is
            the page's convention for a footnote nobody needs to read, and it was
            doing its job too well — --dust on --raise is deliberately the quietest
            pair in the system, so the one line telling you there is a word in the
            grid was the line least likely to be seen. A hint that goes unread is
            just clutter.

            Mint specifically, out of the four fills, because it is the wall's own
            green — the caption and the thing it is about are visibly the same
            object, which no amount of extra size would have achieved. 8.3:1.

            And TILTED, so no .chip-true here. Per the note on .chip-violet, the
            tilt is what separates a label the site applied to itself from a badge
            asserting a fact; a straight pill next to a grid of green squares is
            exactly the "this is data" reading the whole component is built to
            avoid. */}
        <p className="chip chip-mint">close your eyes 70%</p>
      </div>

      {/* FLUID CELLS, which is what makes the wall run the whole length of its
          panel. It used to size each cell at a fixed 0.625rem, and 52 of those
          plus gaps comes to about 676px — so inside an 88rem container the grid
          stopped a little past halfway and left the rest of the panel empty,
          with the word bunched into the left half of it.

          So the columns are fractions of the container instead of a measurement,
          and the cells take their height from their own width via aspect-square.
          The wall is then exactly as wide as the panel at every breakpoint, the
          52-week shape is preserved, and the cell size is whatever that implies —
          around 22px on a wide screen, around 6px on a phone.

          This also retires the horizontal scroll this needed while the cells were
          fixed: nothing overflows any more, so nothing has to be scrolled to or
          cropped, and the full word is visible at every width. */}
      <div className="mt-3 rounded-tile border border-edge bg-raise p-3">
        <div
          className="grid w-full gap-[2px] sm:gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            // Row-major now. Fractional tracks have to be declared as columns,
            // and gridAutoFlow: column would have made these the IMPLICIT axis,
            // where the template does not reach them.
            const row = Math.floor(i / COLS);
            const col = i % COLS;

            if (MASK[row][col]) {
              return (
                <span
                  key={i}
                  className="wall-cell aspect-square rounded-[2px]"
                  style={
                    {
                      background: WORD_FILL,
                      "--wall-col": col,
                    } as React.CSSProperties
                  }
                />
              );
            }

            // Everything that is not lettering is held to the bottom half of the
            // ramp. The noise is still there — the wall would look like a banner
            // without it — but a stray dark cell beside a letter reads as part of
            // the letter, and four of those turn an O into a Q.
            const l = Math.min(level(i), 2);
            return (
              <span
                key={i}
                className="wall-cell aspect-square rounded-[2px]"
                style={
                  {
                    background: l === 0 ? "rgb(var(--sunk))" : FILL[l],
                    "--wall-col": col,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
