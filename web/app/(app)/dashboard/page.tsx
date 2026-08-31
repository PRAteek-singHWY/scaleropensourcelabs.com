import { Suspense } from "react";
import type { Metadata } from "next";
import MemberDashboard from "@/components/MemberDashboard";

// A MEMBER'S OWN PAGE. Where signing in leads, and where everything the club asks a
// member to do afterwards lives.
//
// It is also the one route that decides whether somebody still needs onboarding — /join
// sends every signed-in reader here without reading their profile, so that question has
// exactly one answer in exactly one place. See the header of MemberDashboard.tsx.
//
// NOT A PRIVILEGE GATE. This HTML ships to anybody who asks for it; the site is a static
// export with no server to refuse them. What refuses them is firestore.rules. See
// lib/auth.tsx before concluding that a page nobody links to is a page nobody can read.
//
// ABSENT FROM PAGES, so it is in neither the nav strip nor the footer's route list — the
// nav's one persistent button already changes to "Profile" and points here once somebody
// is signed in, and the same word in the strip as well would be the site's one action
// said twice.
//
// `noindex`, because a page that only means anything to one signed-in person has no
// business in a search index.

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your club details, and the programmes you are enrolled in.",
  robots: { index: false, follow: false },
};

export default function Dashboard() {
  return (
    <main id="main">
      {/* `.page-top` is the shared clearance under the floating header — see the note in
          globals.css. It is the same number for the app shell because the app shell is
          deliberately the same height as the site nav. */}
      <section className="section page-top pb-8">
        {/* THE CAP IS ON AN INNER DIV, NOT ON `.section`. This is the trap globals.css
            documents against `.page-top` and `pt-*`, hit in the other direction: every
            custom class in that file is declared after `@tailwind utilities`, so at equal
            specificity source order hands the win to `.section` and its `max-w-[88rem]`
            silently beats a `max-w-6xl` sitting next to it. The markup said 72rem and the
            screen said 88rem, with nothing anywhere to explain the difference.
            72rem: the details are a four-tile row, which wants the room, and the mentor
            picker is prose a person reads, which does not. This is where they stop
            fighting. */}
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl font-display text-display-lg font-bold tracking-tight">
            Your club.
          </h1>

          {/* useSearchParams inside the dashboard needs a Suspense boundary, or
              `next build` refuses to prerender this route — at build time rather than at
              runtime, which is the good version of that error. The fallback reserves
              roughly the first card's height so the page does not jump. */}
          <div className="mt-8">
            <Suspense fallback={<div className="h-[40rem]" aria-hidden />}>
              <MemberDashboard />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
