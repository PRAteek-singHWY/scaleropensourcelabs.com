"use client";

// A link that throws confetti on the way to its target.
//
// It is an <a> with a real href, not a button with a scroll handler, and that is
// the whole design: the celebration is decoration bolted onto a link that already
// worked. Middle-click, ctrl-click, "copy link address" and a reader with
// JavaScript disabled all behave exactly as they did before — the anchor is
// untouched and never preventDefault()ed.
//
// The client boundary stops here rather than at the page. Everything around it
// stays a server component; this is one leaf that needs an onClick.

import { celebrate } from "@/components/fx/celebrate";

export default function CelebrateLink({
  href,
  className,
  children,
  tabIndex,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  tabIndex?: number;
}) {
  return (
    <a
      href={href}
      className={className}
      tabIndex={tabIndex}
      // Not awaited and not blocking. celebrate() dynamically imports a chunk;
      // awaiting it here would hold the click handler open for the length of a
      // network fetch before the browser was allowed to follow the anchor.
      onClick={() => {
        void celebrate();
      }}
    >
      {children}
    </a>
  );
}
