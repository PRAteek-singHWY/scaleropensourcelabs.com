// The site's signature element.
//
// A member's rank among a repo's contributors is the hardest-won fact about them —
// "#2 of 40 in OWASP/OpenCRE" says more than any total. So it gets a typographic
// treatment of its own and appears everywhere the site talks about a person:
// display numerals for the position, a mono denominator for the pool, set as a
// fraction. Everything around it stays quiet so this is the thing you remember.

export type RankBadgeProps = {
  rank: number;
  totalContributors: number | null;
  /** false → the pool size is a lower bound, shown with a trailing +. */
  contributorsExact?: boolean;
  size?: "sm" | "md" | "lg";
  /** Highlight in the signal colour. Reserve for the single best rank on a page. */
  emphasis?: boolean;
};

export default function RankBadge({
  rank,
  totalContributors,
  contributorsExact = true,
  size = "md",
  emphasis = false,
}: RankBadgeProps) {
  const num =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
        ? "text-lg"
        : "text-2xl";
  const den = size === "lg" ? "text-sm" : size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span
        className={`font-display font-extrabold tracking-tightest ${num} ${
          emphasis ? "text-site-amber" : "text-site-ink"
        }`}
      >
        <span aria-hidden className="opacity-45">
          #
        </span>
        {rank}
      </span>
      {totalContributors !== null && (
        <span className={`font-mono ${den} text-site-dim`}>
          <span aria-hidden className="px-[1px] opacity-45">
            ⁄
          </span>
          {totalContributors}
          {contributorsExact ? "" : "+"}
        </span>
      )}
      <span className="sr-only">
        Ranked {rank}
        {totalContributors !== null
          ? ` out of ${totalContributors}${contributorsExact ? "" : " or more"} contributors`
          : ""}
      </span>
    </span>
  );
}
