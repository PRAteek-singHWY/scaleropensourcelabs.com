// A commit graph, as the visual for "software built in public".
//
// The job is to make one idea visible in a second: your work happens on a branch
// beside the project's history, and then it becomes part of that history. That is
// the whole mechanic of open source and it is genuinely hard to say in a sentence,
// which is the test for whether a diagram is worth drawing.
//
// SVG IS RIGHT HERE and was wrong for the PR timeline, for a reason worth writing
// down: this graph has no words inside it. It is pure line art — two lanes, five
// nodes, a fork and a merge — so it can scale with `viewBox` and never reflow.
// Every label sits in the DOM around it. The rule that emerged on this project is
// simply: text in the DOM, lines in SVG, never text inside SVG.
//
// Drawn with `vector-effect="non-scaling-stroke"` so the 2px rails stay 2px at
// every width instead of thickening as the graph is stretched — which is what makes
// a scaled SVG diagram look like a zoomed image rather than a drawing.
//
// Colour: the project's lane is neutral (it is context) and the contributor's lane
// is the accent (it is the reader). The merge node is accent-filled because that is
// the moment the diagram exists to show. No colour carries information that the
// labels below do not also state.

const NEUTRAL = "rgb(var(--dust))";
const ACCENT = "rgb(var(--accent))";

export default function CommitGraph({ className = "" }: { className?: string }) {
  return (
    // A STAGGER GROUP, which is what draws the graph. The figure's two children —
    // the picture and the three labels under it — come up in sequence, and the
    // `.is-in` this earns is what the lane and node animations in globals.css key
    // off. Nothing here decides WHEN: the reveal observer does, exactly as it does
    // for every section, so the diagram cannot animate ahead of the block it
    // explains and a bundle failure leaves it fully drawn.
    <figure className={className} data-reveal-group>
      {/* aria-hidden with the meaning carried by the labelled list underneath. A
          screen reader gets the three sentences, which is strictly more than a
          description of the picture would give it.

          The lane drawing itself is the one animation on this site that is doing
          the diagram's own job: the graph's whole claim is that your branch LEAVES
          the history and REJOINS it, and a line that arrives already joined has to
          be read rather than watched.

          NONE OF THAT DRAW IS AUTHORED HERE ANY MORE, which is the repair. Each
          lane used to carry its own length in a `--lane` variable so that a stroke
          dash could uncover it, and that number cannot be written in any unit that
          survives contact with a real screen. `vector-effect: non-scaling-stroke`
          takes dash lengths out of the viewBox scale, and which pixels they then
          mean — CSS or device — is not the same answer in every browser. Measured,
          not guessed: a lane declared as 95cqw came out as 1077 CSS px, was read as
          1077 DEVICE px on a 150%-scaled Windows display, and painted two thirds of
          a rail 1701 device px long before falling into the gap. Both lanes broke
          in the same place, at the same fraction, on an ordinary laptop.

          So globals.css wipes each lane with a clip instead, left to right, taken
          from the path's own bounding box. Both lanes only ever advance in x, so a
          wipe and a draw are the same picture — and there is now no length anywhere
          in the effect to get wrong, at any width, on any display, in any unit. The
          `d` attributes below can be reshaped freely with nothing to retune. */}
      <svg
        viewBox="0 0 320 96"
        className="block h-auto w-full"
        aria-hidden
        focusable="false"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        {/* The project's own history, running straight through. */}
        <path
          className="graph-lane"
          d="M8 28 H312"
          stroke={NEUTRAL}
          vectorEffect="non-scaling-stroke"
        />

        {/* Your branch: forks after the second commit, carries two commits of its
            own, and rejoins. The curves are quarter-arcs rather than diagonals,
            which is how git clients actually draw this. */}
        <path
          className="graph-lane"
          d="M96 28 C112 28 116 68 132 68 H200 C216 68 220 28 236 28"
          stroke={ACCENT}
          vectorEffect="non-scaling-stroke"
        />

        {/* Commits on the project's lane.

            --node-i is the position in the SEQUENCE THE DIAGRAM DESCRIBES, not in
            document order, and the two disagree on purpose: the last project
            commit sits at x=288, to the right of the merge, but it happens after
            it — so it is index 6 and the merge is 5. Ordering these by their x
            coordinate would have the history complete itself before the change
            that completes it. */}
        {[8, 52, 96, 288].map((x, i) => (
          <circle
            key={x}
            className="graph-node"
            style={{ "--node-i": x === 288 ? 6 : i } as React.CSSProperties}
            cx={x}
            cy={28}
            r={5}
            fill="rgb(var(--bg))"
            stroke={NEUTRAL}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Commits on yours. */}
        {[132, 200].map((x, i) => (
          <circle
            key={x}
            className="graph-node"
            style={{ "--node-i": 3 + i } as React.CSSProperties}
            cx={x}
            cy={68}
            r={5}
            fill="rgb(var(--bg))"
            stroke={ACCENT}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* The merge. Filled, because this is the event the whole graph is for —
            and last but one in the sequence for the same reason. */}
        <circle
          className="graph-node"
          style={{ "--node-i": 5 } as React.CSSProperties}
          cx={236}
          cy={28}
          r={7}
          fill={ACCENT}
          stroke={ACCENT}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* A group of its own, so the three explanations arrive in order rather than
          as one block — the same reading order the picture above has just drawn. A
          nested group is skipped as an item of its parent (see Reveal.tsx), so the
          list does not also slide up as a whole. */}
      <ol
        className="mt-7 grid gap-6 border-t border-seam pt-6 sm:grid-cols-3"
        data-reveal-group
      >
        <li>
          <p className="font-mono text-[1rem] uppercase tracking-[0.16em] text-dust">
            The grey line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            The project&apos;s history — every change anyone has ever made to it,
            public, in order, with names attached.
          </p>
        </li>
        <li>
          <p className="font-mono text-[1rem] uppercase tracking-[0.16em] text-accent">
            The blue line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            Your branch. You copy the project, change something on your own copy, and
            nothing you do here can break anybody else&apos;s work.
          </p>
        </li>
        <li>
          <p className="font-mono text-[1rem] uppercase tracking-[0.16em] text-accent">
            The filled dot
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            The merge. A maintainer agreed, and your change is now part of the grey
            line — permanently, and for everyone who downloads it after.
          </p>
        </li>
      </ol>
    </figure>
  );
}
