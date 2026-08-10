import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// TWO FACES, read off the OSC Figma rather than a reference site. Self-hosted at
// build time by next/font, so no third-party request and no layout shift.
//
// This replaced a three-face system (Poppins / Anton / Staatliches). The Figma is
// a narrower type system than what it replaced, and that is the design decision,
// not an omission: everything that is not body copy or a headline is JetBrains
// Mono. There is no condensed-caps face anywhere in the file.
//
// Body. Inter Regular at 15px, which is what every paragraph in the frames is.
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Display. Archivo Bold — the frames set every headline in it, from the 96px page
// titles down to the 32px footer wordmark. The Figma pins `wdth 100`, i.e. the
// default width axis, so the static Bold is an exact match rather than an
// approximation; there is nothing to substitute here.
//
// Note this is a grotesque, NOT the heavy condensed poster face it replaces. The
// design's authority comes from size and weight at normal width, so keeping Anton
// would have been a different voice at the same size.
const display = Archivo({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

// Identifiers, figures, labels, eyebrows, nav items and buttons — everything the
// old system split between Staatliches and mono. One face, one variable: the
// `--font-label` name is gone rather than aliased, so there is no second name for
// the same font waiting to drift.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import Footer from "@/components/Footer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://scaleropensourcelabs.com";

const DESCRIPTION =
  "Students at Scaler School of Technology contributing to the open-source projects the world already runs on.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Scaler Open Source Club",
    template: "%s · Scaler Open Source Club",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Scaler Open Source Club",
    title: "Scaler Open Source Club",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image", title: "Scaler Open Source Club", description: DESCRIPTION },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        {/* Anti-flash for the theme toggle.
            Must be the first node in <body>, NOT in <head>: the App Router hoists
            and strips a manually-authored <head>, so a script placed there never
            ships. It runs synchronously before anything below paints, so a reader
            who chose light never sees a frame of dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=localStorage.getItem('osc-theme');if(m==='light'||m==='dark'){document.documentElement.setAttribute('data-theme',m)}}catch(e){}})()",
          }}
        />

        {/* Skip link. It did not matter much on a single page; with a persistent
            eight-item nav in front of every one of six pages, a keyboard reader
            would otherwise tab through the whole bar on every navigation. First
            focusable element in the document, visible only when focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-raise focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg focus:ring-1 focus:ring-seam"
        >
          Skip to content
        </a>

        {/* The chrome shared by every route. Nav and Footer are here rather than in
            each page so a route cannot exist without them — the previous single-page
            site imported them per page, which works for one page and is six chances
            to forget at six. Reveal renders nothing; it opts the document in to the
            scroll settle. */}
        <Nav />
        <Reveal />
        {children}
        <Footer />
      </body>
    </html>
  );
}
