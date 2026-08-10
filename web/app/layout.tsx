import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

// TWO faces, where there were four. Both self-hosted at build time by next/font,
// so there is no third-party request and no layout shift.
//
// This replaces a trio — Anton for display, Staatliches for labels and buttons,
// Poppins for body — that was read off notyourcollege.com and built for a poster
// register: heavy, condensed, all-caps, shouting. The audience for this page is
// sixteen and seventeen year olds deciding whether this club is for them, and a
// poster shouts AT that reader rather than talking to them.
//
// Plus Jakarta Sans does all three jobs. It is the modern humanist geometric the
// brief asks for — rounder and warmer than Inter, cleaner and less bubbly than
// Poppins — and crucially it ships 200-800, so display, label and body are
// weights of ONE family rather than three families pretending to agree. The
// aliasing that points --font-display and --font-label at it lives in
// globals.css, next to the note about what that costs (every display usage now
// has to state its own weight).
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

// THE DISPLAY FACE. Headlines only — the hero, every section heading, the big
// figures. Body, labels and buttons stay on Plus Jakarta Sans above.
//
// SPACE GROTESK, replacing Syne — cool and legible, in that order of difficulty.
//
// Syne had the personality and paid for it in reading. Its ascenders and
// descenders are unusually long, so at 800 a two-line heading fused into one dark
// block: the descender of "picked" landed in the cap-height of the line below it.
// The evidence that this was a real problem and not a preference is in
// tailwind.config.ts — EVERY step of the type scale had to be loosened to
// accommodate one face. When a typeface forces the whole vertical rhythm to move,
// the typeface is the thing that is wrong.
//
// Space Grotesk keeps the character and gives the space back. It is still
// distinctly not-neutral — the flat-sided round forms, the single-storey 'a' at
// display size, the squared terminals — and it is the face this audience already
// reads as "developer", which is the register the whole page is in. But its
// extenders are short, its counters are open, and its x-height is large, which is
// most of what legibility is at small sizes and all of what it is at large ones.
//
// Impact and Bebas Neue stay rejected for the reasons below, unchanged:
//
//   * IMPACT is a system font. It is not on the web, it is absent from most
//     Android and many Linux installs, and next/font cannot self-host it — a
//     headline set in it would be Impact on some machines and whatever Helvetica
//     the fallback stack lands on elsewhere. A display face that renders
//     differently per visitor is not a display face.
//
//   * BEBAS NEUE HAS NO LOWERCASE. Every heading it touches becomes capitals,
//     and this page's section headings are two-clause sentences — "Most students
//     never apply because nobody told them these exist." An earlier pass on this
//     site already had to remove all-caps headings for exactly this reason: at
//     display size they ran to three full lines of capitals and read as a wall.
//
// 700 IS THE CEILING, and it is why every display call site moved from
// `font-extrabold` to `font-bold` in the same change. Space Grotesk ships
// 300–700; an element asking for 800 gets the 700 master plus SYNTHETIC
// emboldening, which smears an already-heavy face. Asking for what exists is the
// difference between a bold headline and a blurry one.
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

// Reserved for identifiers and figures — repo names, counts, labels.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
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
        {children}
      </body>
    </html>
  );
}
