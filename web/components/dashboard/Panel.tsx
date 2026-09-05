"use client";

// One card on the dashboard, with the header treatment every panel in the design shares:
// an accent-tinted icon, a mono uppercase title, and an optional action at the right.
//
// EXTRACTED BECAUSE FIVE PANELS HAD THE SAME HEADER AND WOULD HAVE DRIFTED. The heading in
// the design is not the display face the rest of the site uses for headings — it is the
// mono label face at an unusually large size, which is what makes a panel read as part of
// an instrument rather than as a section of an article. That is a distinctive enough
// choice that five hand-copied versions of it would end up as five slightly different
// sizes, and the difference would be visible because the panels sit in one column.
//
// `tone` exists for the one panel the design fills solid — "Where to go next" is a block
// of accent blue with white type on it, and it is the only coloured surface on the page.
// Everything on it therefore has to take its colour from the same set, which is why the
// tone is a property of the PANEL rather than a class the caller adds: a caller that
// styled its own children for the blue ground would get it wrong in dark mode, where the
// accent is a pale periwinkle and black type is what reads on it.

import type { ReactNode } from "react";
import Icon from "@/components/Icon";

type IconName = Parameters<typeof Icon>[0]["name"];

export default function Panel({
  icon,
  title,
  action,
  tone = "plain",
  id,
  children,
}: {
  icon: IconName;
  title: string;
  /** Rendered at the right of the header — "View all", a count, a button. */
  action?: ReactNode;
  tone?: "plain" | "accent";
  /** Anchor target, so the sidebar's Pull Requests and Settings items can reach it. */
  id?: string;
  children: ReactNode;
}) {
  const accent = tone === "accent";

  // ANCHORED PANELS NEED TO CLEAR THE STICKY BAR. Without a scroll margin the browser
  // scrolls the panel's top edge to y=0, which is underneath a 3.5rem bar that is fixed to
  // the top — so following a link to a panel hides its own heading. It happened to look
  // right at one window size, which is the worst way for this to be wrong: the bug appears
  // only at widths nobody checked.
  //
  // 5rem rather than 3.5: the bar's height plus enough air that the heading reads as the
  // top of something rather than as a line jammed under a border.
  const anchorable = id ? "scroll-mt-20" : "";

  return (
    <section
      id={id}
      /* Focusable only when it is an anchor target, and only programmatically (-1), so a
         keyboard reader who follows the nav link lands INSIDE the panel rather than
         continuing from wherever they were. It never joins the tab order. */
      tabIndex={id ? -1 : undefined}
      className={
        accent
          ? // `text-raise`, NOT `text-white` and NOT a `dark:` pair. The accent is
            // #0038FF in light and a pale periwinkle in dark, so the ink that reads on it
            // has to flip — and `--raise` already flips exactly that way: white on the
            // blue, near-black on the periwinkle, 7:1 and better in both.
            //
            // A `dark:` variant would have been WRONG here rather than merely verbose:
            // this project sets no `darkMode` in tailwind.config.ts, so `dark:` follows
            // prefers-color-scheme while the site's own toggle sets data-theme. Somebody
            // choosing light on a dark laptop would have got black type on blue.
            "rounded-panel bg-accent p-6 text-raise sm:p-7"
          : "card rounded-panel bg-raise p-6 sm:p-7"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={
              accent
                ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raise/20"
                : "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"
            }
          >
            <Icon name={icon} size="1rem" strokeWidth={1.75} />
          </span>
          {/* h2, so the page outline runs h1 (the page) -> h2 (each panel) -> h3 (items
              inside one). The size is set here rather than inherited because this is the
              mono face doing a heading's job. */}
          <h2
            className={`truncate font-mono text-[1.0625rem] font-medium uppercase tracking-[0.08em] ${
              accent ? "" : "text-ink"
            }`}
          >
            {title}
          </h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}
