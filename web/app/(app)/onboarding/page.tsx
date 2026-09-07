import { Suspense } from "react";
import type { Metadata } from "next";
import OnboardingGate from "@/components/OnboardingGate";

// STEP TWO OF JOINING, on its own route. /join proves which college you are at; this asks
// the three things the college address cannot answer.
//
// NOT A PRIVILEGE GATE, and it does not pretend to be one. The site is a static export, so
// this HTML ships to anybody who asks for it — signed in or not, member or not. What
// refuses to store or return anything is firestore.rules. See lib/auth.tsx before
// concluding that a hidden route is a safe one.
//
// ABSENT FROM PAGES, so it is in neither the nav strip nor the footer's route list. It is
// somewhere you are sent, once, not somewhere you browse to.
//
// `noindex`, because a form that only means anything to one signed-in person has no
// business in a search result.

export const metadata: Metadata = {
  title: "Finish joining",
  description: "Three questions, and you are a member of the Scaler Open Source Club.",
  robots: { index: false, follow: false },
};

export default function Onboarding() {
  return (
    <>
      <section className="section pb-8">
        {/* CENTRED AND NARROW, which the dashboard is not. This is a single task with one
            control at the end of it, and a form column stretched across a 1400px page is
            the layout that makes a sign-up feel like paperwork — the name and GitHub
            fields end up a foot apart. 42rem is the widest that two-up row reads
            comfortably at.
            THE CAP IS ON AN INNER DIV, NOT ON `.section`. Custom classes in globals.css
            are declared after `@tailwind utilities`, so `.section`'s `max-w-[88rem]` wins
            on source order and a `max-w-2xl` beside it does nothing at all — the markup
            says 42rem and the screen says 88rem. Same trap as `.page-top` and `pt-*`,
            which that file documents. */}
        <div className="mx-auto max-w-2xl">
          <p className="label">Almost there</p>
          <h1 className="mt-4 font-display text-display-lg font-bold tracking-tight">
            Three questions.
          </h1>
          <p className="mt-4 text-body-lg text-haze">
            You only do this once, and you can change any of it later. It is what the
            organisers see when they are putting build-day pairs and programme cohorts
            together.
          </p>

          {/* The gate reads the query string, which needs a Suspense boundary or
              `next build` refuses to prerender this route — at build time rather than at
              runtime, which is the good version of that error. The fallback reserves
              roughly the card's height so the page does not jump when it resolves. */}
          <div className="mt-9">
            <Suspense fallback={<div className="h-[40rem]" aria-hidden />}>
              <OnboardingGate />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
