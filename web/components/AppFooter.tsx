// The signed-in area's footer. One line, and only what a member might actually need.
//
// The site footer carries four columns of argument — what the club produces, how it runs,
// what it needs — plus every route and a terminal. All of that is aimed at somebody
// deciding whether to join, and it was appearing under the dashboard of somebody who
// already had. It is 500px of persuasion addressed to the wrong reader.
//
// What survives is the three privacy anchors, and they survive for a reason rather than
// out of caution: this is the part of the site that holds a member's name, address and
// hostel, so "what happens to my details" and "how do I get this deleted" are live
// questions here in a way they are not on a marketing page. They are the same three links
// the sign-in card carries, pointing at the same three sections of /privacy.

import Link from "next/link";
import { LINKS } from "@/content/site";

export default function AppFooter() {
  return (
    <footer className="section pb-10 pt-16">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-seam pt-6">
        {/* `.tap` on each link and gap-y-4 to pay for it. The QA sweep measures these
            under the 44px touch floor otherwise, on both themes at mobile. */}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <Link href="/privacy#what-we-store" className="tap link-u text-haze">
            Privacy
          </Link>
          <span aria-hidden className="h-4 w-px bg-seam" />
          <Link href="/privacy#terms" className="tap link-u text-haze">
            Terms
          </Link>
          <span aria-hidden className="h-4 w-px bg-seam" />
          <Link href="/privacy#data-deletion" className="tap link-u text-haze">
            Data deletion
          </Link>
          <span aria-hidden className="h-4 w-px bg-seam" />
          <a href={`mailto:${LINKS.email}`} className="tap link-u text-haze">
            Email the organisers
          </a>
        </p>
        {/* The club, not the university. SST is where its members study; signing the
            university's name to a student project would claim an endorsement nobody
            gave. */}
        <p className="text-sm text-dust">
          © {new Date().getFullYear()} Scaler Open Source Club
        </p>
      </div>
    </footer>
  );
}
