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
      {/* THE CONTAINER IS FOR THE LANE DRAW, and it is the fix for a genuine
          conflict between two things this diagram wants at once.

          `vector-effect: non-scaling-stroke` is what keeps the rails 2px at every
          width instead of thickening as the graph stretches (see the note at the
          top of this file). Its side effect is that stroke dash lengths are then
          measured in SCREEN pixels rather than user units — and that quietly
          defeats the `pathLength={1}` trick the heading underlines draw themselves
          with. Measured, not guessed: with pathLength normalisation the dash comes
          out as "the whole path" = 304 units, that number is then read as 304px
          against a lane rendered 1199px long at 1440, and the lane paints as four
          dashes with three gaps in it. It looked like a broken diagram, which is
          exactly what it was.

          So the dash length is authored per lane as a fraction of the container's
          width instead — the one unit that tracks the rendered size of a
          `w-full` svg. 304 of 320 viewBox units is 95cqw; the branch's 181 is
          57cqw. Both then equal their lane's own screen length at every width,
          which is what makes one dash cover exactly one lane. */}
      <div className="[container-type:inline-size]">
        {/* aria-hidden with the meaning carried by the labelled list underneath. A
            screen reader gets the three sentences, which is strictly more than a
            description of the picture would give it.

            The lane drawing itself is the one animation on this site that is doing
            the diagram's own job: the graph's whole claim is that your branch
            LEAVES the history and REJOINS it, and a line that arrives already
            joined has to be read rather than watched. */}
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
          style={{ "--lane": "95cqw" } as React.CSSProperties}
          d="M8 28 H312"
          stroke={NEUTRAL}
          vectorEffect="non-scaling-stroke"
        />

        {/* Your branch: forks after the second commit, carries two commits of its
            own, and rejoins. The curves are quarter-arcs rather than diagonals,
            which is how git clients actually draw this. */}
        <path
          className="graph-lane"
          style={{ "--lane": "57cqw" } as React.CSSProperties}
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
      </div>

      {/* A group of its own, so the three explanations arrive in order rather than
          as one block — the same reading order the picture above has just drawn. A
          nested group is skipped as an item of its parent (see Reveal.tsx), so the
          list does not also slide up as a whole. */}
      <ol
        className="mt-7 grid gap-6 border-t border-seam pt-6 sm:grid-cols-3"
        data-reveal-group
      >
        <li>
          <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-dust">
            The grey line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            The project&apos;s history — every change anyone has ever made to it,
            public, in order, with names attached.
          </p>
        </li>
        <li>
          <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-accent">
            The blue line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            Your branch. You copy the project, change something on your own copy, and
            nothing you do here can break anybody else&apos;s work.
          </p>
        </li>
        <li>
          <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-accent">
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
