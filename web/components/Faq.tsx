"use client";

// The FAQ, as an accordion.
//
// It was a plain <dl> with every answer open — seven questions and seven
// paragraphs, about a screen and a half of continuous prose near the foot of a
// very long page. Collapsing it trades some scannability for a section a reader
// can take in at once, and the motion is the part that makes the trade legible:
// an answer that appears instantly reads as the page jumping, where one that opens
// reads as the reader having opened it.
//
// THE MARKUP STAYS A DEFINITION LIST. The obvious rewrite is a stack of <button>s
// and <div>s, and it throws away the one thing the original markup got right —
// this IS a list of terms and their definitions, and a screen reader announcing
// "definition list, 7 items" is telling the truth about the section. So the button
// goes INSIDE the <dt> and the panel IS the <dd>, which is valid and keeps both
// the semantics and the accordion.
//
// ONE OPEN AT A TIME, and any one closable. The alternative — independent toggles
// — means a reader who opens all seven is back at the wall of text this replaced,
// having clicked seven times to get there. Single-open also makes the motion mean
// something: the outgoing answer closes as the incoming one opens, so the section
// keeps roughly its height and the page below it does not jump.
//
// EVERYTHING IS CLOSED ON ARRIVAL. The first answer used to be open, on the
// argument that a column of closed rows gives a reader nothing to judge whether
// opening one is worth it. In place it read the other way round: one expanded row
// among six collapsed ones looks like a row someone left open rather than a
// deliberate resting state, and it puts the section's first answer — "no, you do
// not need DSA" — in front of a reader who has not asked the question, while the
// six questions they might actually have are pushed down past it.
//
// Closed, the section is a list of the seven things people ask, which is what its
// heading says it is and what a reader scans it for.

import { useId, useState } from "react";

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  // Prefixed per instance rather than per item: two FAQs on one page would
  // otherwise both emit #panel-0 and every aria-controls would point at the first.
  const base = useId();

  return (
    // Its own reveal group, nested inside the section's. Reveal.tsx skips a child
    // that is itself a group, so the section no longer treats this whole list as
    // one settle target — the rows now come up in sequence when the list is
    // scrolled to, which is the same treatment every other card grid on the page
    // already gets.
    <dl className="mt-7 max-w-3xl" data-reveal-group>
      {items.map((f, i) => {
        const isOpen = open === i;
        const qId = `${base}-q-${i}`;
        const aId = `${base}-a-${i}`;

        return (
          <div key={f.q} className="border-t border-seam">
            <dt>
              <button
                id={qId}
                type="button"
                // No py-7 here: .faq-q carries its own vertical padding, because a
                // utility would lose to it in the cascade. See the note on the class.
                className="faq-q"
                aria-expanded={isOpen}
                aria-controls={aId}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span className="text-body-lg font-semibold">{f.q}</span>
                {/* Decorative: the button's expanded state is already announced
                    by aria-expanded, and a screen reader reading out a plus sign
                    on top of that is noise. */}
                <span className="faq-mark" aria-hidden="true" />
              </button>
            </dt>
            <dd
              id={aId}
              className="faq-panel"
              data-open={isOpen}
              // The collapsed panel is still in the DOM — it has to be, or there
              // is no height to animate from. aria-hidden keeps it out of the
              // accessibility tree while it is closed. There is nothing focusable
              // inside an answer (they are plain sentences), so this does not
              // create the usual trap of a tabbable control inside a hidden
              // region, and no `inert` polyfill is needed on React 18.
              aria-hidden={!isOpen}
            >
              <div>
                <p className="measure pb-7 text-body text-haze">{f.a}</p>
              </div>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
