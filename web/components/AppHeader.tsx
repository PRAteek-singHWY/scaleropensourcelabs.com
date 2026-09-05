"use client";

// The signed-in area's own header. NOT the site nav.
//
// WHY IT IS NOT THE SITE NAV. /dashboard used to carry the marketing bar — Essence,
// Projects, Programmes, Hall of Fame, Team, How to Join, and a filled JOIN button that
// had relabelled itself to DASHBOARD and pointed at the page you were already on. Every
// one of those is an argument aimed at somebody deciding whether to join. A member who
// has joined is past that argument, and a control that navigates you to where you already
// are is the clearest possible signal that a page is wearing somebody else's chrome.
//
// So the signed-in routes get their own shell: the wordmark back to the public site, the
// account you are signed in as, and the theme control. Nothing that sells the club to
// somebody who is already in it.
//
// THE GEOMETRY IS DELIBERATELY IDENTICAL to the site nav — 0.75rem inset, a 3.5rem plate,
// same `.plate` fill and blur. `.page-top` and `scroll-padding-top` in globals.css are
// both derived from that height and there is exactly one copy of the number; a header of
// a different height here would need a second copy, which is the thing that comment
// forbids. Same object, different contents.

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { batchFromEmail } from "@/lib/batch";

export default function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const batch = batchFromEmail(user?.email);
  // The Google display name is usually the fuller one; the address is the fallback and
  // the initial comes from whichever we have. Never an empty circle.
  const name = user?.displayName || user?.email?.split("@")[0] || "";
  const initial = (name.trim()[0] ?? "·").toUpperCase();

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
      <div className="plate mx-auto flex h-[56px] w-full max-w-[88rem] items-center gap-4 rounded-full border border-edge px-4 sm:px-6">
        {/* THE ONE WAY BACK TO THE PUBLIC SITE, and it is the wordmark rather than a
            "← Back to site" link, because that is where a wordmark goes in every app a
            member has ever used and it costs no width on a phone. */}
        {/* `-my-3 py-3` is the site nav's own fix for this exact control and it is copied
            rather than reinvented: a wordmark is 28px of glyph, which is under the 44px
            touch floor, and the padding grows the target without moving anything on
            screen. The QA sweep measured this at 33x28 on mobile before it was added. */}
        <Link
          href="/"
          className="-my-3 inline-block shrink-0 py-3 font-display text-lg font-bold tracking-tight text-ink transition-colors hover:text-accent"
        >
          OSC
        </Link>

        {/* The rule is drawn rather than typed, for the reason the site nav's separators
            are: a "|" glyph in --seam measures around 1.4:1 and has to answer a text
            contrast bar it was never trying to meet. */}
        <span aria-hidden className="hidden h-5 w-px shrink-0 bg-seam sm:block" />
        <p className="hidden shrink-0 font-mono text-label uppercase tracking-wider text-dust sm:block">
          Member area
        </p>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Only for an organiser, and it is a convenience rather than a gate — /admin
              renders nothing for anybody else because the rules refuse the query, not
              because this link is hidden. */}
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden font-mono text-label uppercase tracking-wider text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink sm:block"
            >
              Organisers
            </Link>
          )}

          {/* WHO YOU ARE, AS AN OBJECT RATHER THAN A LINE OF TEXT. The initial disc is
              the thing that makes a page read as an account rather than as a form: it is
              the same accent-filled shape the step markers and the sign-in card's tile
              use, so it is this system's device rather than a generic avatar. */}
          {user && (
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-bold text-bg"
              >
                {initial}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-[12rem] truncate text-sm font-semibold text-ink">
                  {name}
                </span>
                {batch && (
                  <span className="block font-mono text-[0.9167rem] uppercase tracking-wider text-dust">
                    {batch.label} · {batch.branch}
                  </span>
                )}
              </span>
            </span>
          )}

          <ThemeToggle />

          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="tap font-mono text-label uppercase tracking-wider text-haze underline decoration-seam underline-offset-4 transition-colors hover:text-ink"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
