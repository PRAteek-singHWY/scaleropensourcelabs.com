// Global representation, as a wall of organisation names.
//
// A MAP WAS THE OBVIOUS CHOICE AND IS THE WRONG ONE. The brief asks for "a map or a
// logo wall", and a world map with dots on it would be the least honest thing on the
// site: a handful of contributions renders as a nearly empty globe, which understates
// real work — and the moment you scale the dots so it looks respectable, you are
// drawing a picture of data you do not have. A named list with a link on each entry
// is duller and checkable, and it grows into something genuinely impressive on its
// own rather than being pre-inflated.
//
// AND THE LOGOS ARE TYPE, not images. Two reasons, either sufficient: an
// organisation's logo is its trademark and putting OWASP's mark on a club page
// implies an endorsement nobody granted; and the site's Content-Security-Policy
// allows `img-src 'self' data:`, so a remote logo would be blocked by the browser
// and render as a broken image. Set in mono inside a bordered plate, it reads as a
// deliberate treatment rather than a missing asset.
//
// GROUPED BY RELATION, which is the load-bearing decision. "Code merged upstream"
// and "alumni working there" are very different claims, and a single undifferentiated
// wall of names would let the weaker one borrow the strength of the stronger — the
// exact quiet inflation the content rules exist to prevent. A reader can see which
// is which without reading a caption.

import { RELATION_LABEL, publishedOrgs, type Org } from "@/content/people";

const ORDER: Org["relation"][] = ["contributed", "mentored", "employs"];

export default function OrgWall() {
  const orgs = publishedOrgs();

  if (orgs.length === 0) {
    return (
      <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-14 text-center">
        <p className="text-display-md font-semibold">No organisations listed yet.</p>
        <p className="measure mx-auto mt-4 text-body text-haze">
          This fills in as members land work in projects outside the university. Each
          entry names the member and links somewhere you can check it.
        </p>
      </div>
    );
  }

  const groups = ORDER.map((relation) => ({
    relation,
    items: orgs.filter((o) => o.relation === relation),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mt-12 space-y-12">
      {groups.map((g) => (
        <div key={g.relation}>
          <div className="flex items-baseline justify-between gap-4 border-b border-seam pb-3">
            <h3 className="label">{RELATION_LABEL[g.relation]}</h3>
            <p className="font-mono text-xs tabular-nums text-dust">
              {g.items.length}
            </p>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((o) => (
              <li key={`${o.name}-${o.relation}`}>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full flex-col rounded-tile border border-seam bg-raise p-5 transition-colors duration-300 ease-glide hover:border-accent/60"
                >
                  <span className="font-mono text-body-lg text-ink transition-colors group-hover:text-accent">
                    {o.name}
                  </span>
                  {o.region && (
                    <span className="mt-1.5 text-[13px] text-dust">{o.region}</span>
                  )}
                  {/* Attributed to a person, not to the institution. "OSC
                      contributed to OWASP" would be a claim about a club; "Prateek
                      Singh did, and here is the repo" is a claim somebody can
                      check. */}
                  {o.via && (
                    <span className="mt-auto pt-4 text-sm text-haze">
                      via {o.via}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
