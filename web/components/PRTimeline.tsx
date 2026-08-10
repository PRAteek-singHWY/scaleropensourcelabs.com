// What actually happens to a pull request, as a timeline.
//
// This is the site's most useful diagram, and it earns its place by removing a
// specific fear rather than by decorating a section. The reason first-years do not
// open pull requests is not that they cannot write the code — it is that they have
// no model of what happens after they press the button, so the whole thing feels
// like submitting an exam to a stranger. Showing the loop, including the step where
// somebody asks for changes, is what makes it look survivable.
//
// So "Changes requested" is drawn as a normal step in the sequence and not as a
// failure state. It carries the ember token — the site's single signal colour — for
// exactly one reason: it is the step readers are afraid of, so it is the step worth
// pointing at. The copy next to it says it is the normal case, because it is.
//
// BUILT IN THE DOM, NOT AS AN SVG, and that was a deliberate reversal. The first
// version was one inline <svg> with <text> nodes, which looked right at 1440px and
// failed everywhere else: the labels do not reflow, they ignore the reader's font
// size, they cannot be selected or translated, and a screen reader gets one long
// unpunctuated string. Line art belongs in SVG; anything with words in it belongs
// in the DOM. The rail here is a CSS border and the dots are divs, so the whole
// thing is a normal <ol> that happens to have a line drawn down the side of it.
//
// It is a diagram of the mechanism, not a claim about our data. Nothing here is a
// number, so there is nothing to source.

const STEPS: {
  label: string;
  body: string;
  /** Only one step is allowed the signal colour. See above. */
  tone?: "accent" | "ember" | "neutral";
}[] = [
  {
    label: "You open the pull request",
    body: "A branch with your change on it, plus a short description of what it fixes and why. This is the part that feels enormous and is actually the smallest.",
    tone: "accent",
  },
  {
    label: "CI runs",
    body: "The project's automated tests run against your branch. If they go red, that is information, not judgement — read the log and push another commit.",
  },
  {
    label: "A maintainer reviews it",
    body: "Somebody who knows the codebase reads your diff. On a busy project this can take days or weeks, and silence is almost never about you.",
  },
  {
    label: "Changes requested",
    body: "The normal case, including for people who do this professionally. It means a human read your work carefully enough to have an opinion about it. You push another commit and the thread continues.",
    tone: "ember",
  },
  {
    label: "Approved and merged",
    body: "Your commit is now in the project's history with your name on it, and it stays there. That is the artefact — not a certificate, the commit.",
    tone: "accent",
  },
];

const DOT: Record<string, string> = {
  accent: "bg-accent",
  ember: "bg-ember",
  neutral: "bg-dust",
};

export default function PRTimeline({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <ol className="relative">
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <li key={s.label} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4">
              {/* The rail. Drawn on this cell rather than as one absolutely
                  positioned line down the list, so it stops exactly at the last
                  dot instead of overshooting past it into the caption. */}
              <div className="relative flex justify-center">
                {!last && (
                  <span
                    aria-hidden
                    className="absolute top-2 h-full w-px bg-seam"
                  />
                )}
                <span
                  aria-hidden
                  className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-bg ${
                    DOT[s.tone ?? "neutral"]
                  }`}
                />
              </div>

              <div className={last ? "pb-0" : "pb-8"}>
                <h3 className="font-mono text-[13px] font-medium uppercase tracking-[0.1em] text-ink">
                  {s.label}
                </h3>
                <p className="measure mt-2.5 text-body text-haze">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <figcaption className="mt-8 border-t border-seam pt-5 text-[13px] leading-relaxed text-dust">
        This is the whole loop. Every open-source contribution anybody has ever made
        went through these five steps, including the ones by people whose names are
        on the projects.
      </figcaption>
    </figure>
  );
}
