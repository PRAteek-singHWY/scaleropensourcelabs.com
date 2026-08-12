// The mid-page banner strip.
//
// Theirs sits between sections: a cream band, a line of condensed caps with the
// load-bearing phrase in blue and a hand-drawn underline beneath it, a doodle either
// side, and the yellow offset-shadow button on the right.
//
// It earns its place on a page this long for a reason the sticky bar does not cover.
// The sticky bar is an ever-present option a reader learns to ignore; this is a
// deliberate stop placed at the one point where the argument has just finished —
// you have read how a first contribution actually goes, so this is where "start
// one" lands. A banner in the wrong place is an advert. In the right place it is a
// conclusion.
//
// Placed after the path section for exactly that reason.
//
// It states no figure and makes no claim, so there is nothing here to source. The
// one number on the page that matters is already above it.

import Link from "next/link";
import Doodle from "@/components/Doodle";
import { LINKS } from "@/content/club";

export default function Banner() {
  return (
    <div className="section">
      <div className="card relative overflow-hidden rounded-panel bg-band px-6 py-8 sm:px-10 sm:py-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <div className="flex items-start gap-4">
            {/* The doodle sits with the text rather than floating decoratively —
                it points at the sentence. */}
            <Doodle
              kind="bolt"
              className="mt-1 h-7 w-5 shrink-0 text-accent"
            />
            <p className="font-display text-display-md font-bold leading-[1.25] tracking-[-0.015em]">
              The people who get in{" "}
              <span className="relative whitespace-nowrap">
                <span className="tone">started early</span>
                {/* Underline drawn under the phrase rather than a border-bottom, so
                    it keeps the hand-made character the rest of the page has. */}
                <Doodle
                  kind="underline"
                  className="absolute -bottom-1.5 left-0 h-2 w-full text-pop"
                />
              </span>
              , not well.
            </p>
          </div>

          <Link href="/join" className="btn btn-pop shrink-0 self-start sm:self-auto">
            Start now →
          </Link>
        </div>
      </div>
    </div>
  );
}
