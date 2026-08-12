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
    <figure className={className}>
      {/* aria-hidden with the meaning carried by the labelled list underneath. A
          screen reader gets the three sentences, which is strictly more than a
          description of the picture would give it. */}
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
        <path d="M8 28 H312" stroke={NEUTRAL} vectorEffect="non-scaling-stroke" />

        {/* Your branch: forks after the second commit, carries two commits of its
            own, and rejoins. The curves are quarter-arcs rather than diagonals,
            which is how git clients actually draw this. */}
        <path
          d="M96 28 C112 28 116 68 132 68 H200 C216 68 220 28 236 28"
          stroke={ACCENT}
          vectorEffect="non-scaling-stroke"
        />

        {/* Commits on the project's lane. */}
        {[8, 52, 96, 288].map((x) => (
          <circle key={x} cx={x} cy={28} r={5} fill="rgb(var(--bg))" stroke={NEUTRAL} vectorEffect="non-scaling-stroke" />
        ))}

        {/* Commits on yours. */}
        {[132, 200].map((x) => (
          <circle key={x} cx={x} cy={68} r={5} fill="rgb(var(--bg))" stroke={ACCENT} vectorEffect="non-scaling-stroke" />
        ))}

        {/* The merge. Filled, because this is the event the whole graph is for. */}
        <circle cx={236} cy={28} r={7} fill={ACCENT} stroke={ACCENT} vectorEffect="non-scaling-stroke" />
      </svg>

      <ol className="mt-7 grid gap-6 border-t border-seam pt-6 sm:grid-cols-3">
        <li>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-dust">
            The grey line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            The project&apos;s history — every change anyone has ever made to it,
            public, in order, with names attached.
          </p>
        </li>
        <li>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            The blue line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            Your branch. You copy the project, change something on your own copy, and
            nothing you do here can break anybody else&apos;s work.
          </p>
        </li>
        <li>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
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
