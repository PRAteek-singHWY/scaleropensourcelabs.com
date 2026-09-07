// The heading every signed-in section opens with.
//
// THE DASHBOARD WAS ONE PAGE AND IS NOW SEVERAL, which is what this exists for. Four
// panels and a form stacked in two columns meant the page answered every question at once
// and none of them first — "asked of you", "from the organisers", "your open source",
// "your details" and the whole mentorship flow, none of which are read at the same moment.
// Split, each section can open on a heading that says what it is and then breathe.
//
// ONE COMPONENT RATHER THAN A HEADING PER PAGE, because the spacing IS the design here.
// Three pages that each invent their own gap between title and content read as three
// pages; the same rhythm on each reads as one product with sections in it.
//
// THE h1 IS REAL AND VISIBLE. The old dashboard carried a visually hidden one because the
// design opened straight on figures — a page with no h1 hands a screen-reader user a
// document with no name. With sections, each one genuinely has a title worth showing, so
// the hidden heading and the apology in its comment both go.

import type { ReactNode } from "react";

export default function SectionHead({
  eyebrow,
  title,
  children,
  action,
}: {
  /** The small mono label above the title. Names the area, not the page. */
  eyebrow: string;
  title: string;
  /** One sentence on what this section is for. Optional — a section whose title says
   *  everything should not be padded with a line that repeats it. */
  children?: ReactNode;
  /** A single control, right-aligned on wide screens and wrapping under the title on a
   *  phone rather than squeezing it. */
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 sm:mb-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="label">{eyebrow}</p>
          <h1 className="mt-3 font-display text-display-lg font-bold tracking-tight">
            {title}
          </h1>
        </div>
        {action}
      </div>
      {children && (
        <p className="measure mt-4 text-body-lg text-haze">{children}</p>
      )}
    </header>
  );
}
