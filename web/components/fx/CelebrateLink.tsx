"use client";

// A link that throws confetti on the way to its target.
//
// It is a real link with a real href, not a button with a scroll handler, and that
// is the whole design: the celebration is decoration bolted onto a link that
// already worked. Middle-click, ctrl-click, "copy link address" and a reader with
// JavaScript disabled all behave exactly as they did before — nothing here is ever
// preventDefault()ed.
//
// NEXT'S Link RATHER THAN A BARE <a>, AND THE CONFETTI IS THE REASON.
//
// Every caller used to point at `#apply`, an anchor on the same page. A hash link
// does not unload the document, so the canvas this appends to <body> stayed up and
// the burst was visible. With the form on its own route those hrefs became "/join",
// and a bare <a> to another route is a full document load: the browser tears down
// the page — canvas included — within a frame or two of the click. The confetti
// still fired, and nobody would ever have seen it. Nothing would have reported
// this; the link works perfectly and only the delight is gone.
//
// Link does a client-side navigation, so <body> survives the route change and the
// burst plays over it. Link also renders a genuine <a> with the href on it, so
// every guarantee in the paragraph above still holds.

import Link from "next/link";
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
    <Link
      href={href}
      className={className}
      tabIndex={tabIndex}
      // Not awaited and not blocking. celebrate() dynamically imports a chunk;
      // awaiting it here would hold the click handler open for the length of a
      // network fetch before the browser was allowed to follow the link.
      onClick={() => {
        void celebrate();
      }}
    >
      {children}
    </Link>
  );
}
