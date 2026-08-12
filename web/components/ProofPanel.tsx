// The lead visual for the upstream-work section.
//
// Apple's tiles put an image under the headline. There is no image to put here —
// `public/` is empty, and the honest alternatives are worse than nothing: a stock
// photo of somebody at a laptop on a page whose entire argument is "every claim
// links to a source" would undercut the argument it decorates.
//
// So the visual is the evidence itself. Our product is merged code, and a product
// page shows the product. Every number below comes from UPSTREAM and is checkable
// against the repo it names.
//
// The form was chosen before the colour, and it is deliberately NOT a chart:
//
//   * `#2` is the one number this section leads with, so it is a HERO FIGURE —
//     >=48px, in the body sans rather than a display face (a display face on a
//     figure reads as off-brand decoration), and with the font's proportional
//     figures. tabular-nums would give every digit the width of a zero and make a
//     display-size number look loose; it belongs in columns that align vertically,
//     which is why the roster table still uses it and this does not.
//
//   * 46 of 74 merged is a single ratio, so it is a METER, not a two-slice pie and
//     not a one-bar bar chart. The unfilled track is a lighter step of the SAME hue
//     as the fill rather than a neutral grey, so the state reads across the whole
//     bar instead of only where the fill stops.
//
//   * Exactly one hero figure in the view. `74`, `46` and the percentage are stat
//     values, not heroes, or the hierarchy says everything is equally important.
//
// Text wears text tokens throughout. The accent appears on the marks and on the
// figure that names the rank, never on a label.

import { UPSTREAM } from "@/content/projects";

export default function ProofPanel() {
  const lead = UPSTREAM.find((p) => p.published && p.proof);
  if (!lead) return null;

  // Parsed from the proof label rather than duplicated, so the panel cannot drift
  // from the card below it. If the shape ever changes, this renders nothing rather
  // than something wrong.
  const rank = lead.proof?.value.match(/#(\d+)\s*\/\s*(\d+)/);
  const merged = lead.did.match(/(\d+)\s+pull requests opened,\s*(\d+)\s+merged/i);
  if (!rank || !merged) return null;

  const [, place, field] = rank;
  const opened = Number(merged[1]);
  const landed = Number(merged[2]);
  const pct = Math.round((landed / opened) * 100);

  return (
    <figure className="mt-14 overflow-hidden rounded-panel border border-seam bg-raise">
      <div className="grid grid-cols-1 gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* ---- The hero figure: the one number this section leads with ---- */}
        <div>
          <p className="label">Contributor rank</p>
          <p className="mt-4 flex items-baseline gap-3">
            <span className="text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-[0.9] tracking-tightest text-accent">
              #{place}
            </span>
            <span className="text-body-lg text-haze">of {field}</span>
          </p>
          <p className="measure mt-5 text-body text-haze">
            By commits on the default branch of{" "}
            <a
              href={lead.url}
              target="_blank"
              rel="noreferrer"
              className="tap font-mono text-sm text-accent hover:brightness-125"
            >
              {lead.repo} ↗
            </a>
          </p>
        </div>

        {/* ---- The meter, and the two values it is built from ---- */}
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline justify-between gap-4">
            <p className="label">Pull requests merged</p>
            <p className="font-mono text-sm text-haze">
              {landed} of {opened}
            </p>
          </div>

          {/* Track is a lighter step of the fill's own hue, so the whole bar
              carries the state. 4px ends, thin mark, anchored left. */}
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full"
            style={{ background: "rgb(var(--accent) / 0.16)" }}
            role="img"
            aria-label={`${landed} of ${opened} pull requests merged, ${pct} per cent`}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: "rgb(var(--accent))" }}
            />
          </div>

          <p className="mt-4 text-body-lg text-ink">
            {pct}% merged.{" "}
            <span className="text-haze">
              The rest were closed or superseded, which is a normal ratio and the
              reason we publish it rather than rounding it up.
            </span>
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-seam pt-6">
            <div>
              <dt className="label">Opened</dt>
              <dd className="mt-1.5 text-display-md font-semibold">{opened}</dd>
            </div>
            <div>
              <dt className="label">Language</dt>
              <dd className="mt-1.5 text-display-md font-semibold">
                {lead.language}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <figcaption className="border-t border-seam px-8 py-4 text-[13px] text-dust sm:px-12">
        {lead.what} Counted from the public repository — open the link and check.
      </figcaption>
    </figure>
  );
}
