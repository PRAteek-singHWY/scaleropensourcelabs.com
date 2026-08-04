import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Poppins, Staatliches } from "next/font/google";
import "./globals.css";

// Three faces, each with one job — the type system read off notyourcollege.com,
// which is the reference for this pass. All self-hosted at build time by
// next/font, so there is no third-party request and no layout shift.
//
// Body. Their body face, and the right call for the register: Poppins is
// geometric and friendly where Instrument Sans was cool and neutral. The whole
// point of this direction is warmth.
const sans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Display. Their hero uses `kapra-italic`, a commercial face I will not pirate,
// so this is a deliberate substitution rather than a match: Anton is the closest
// free equivalent for that heavy condensed poster-caps voice.
//
// It has no true italic, and I am NOT faking one with skewX — a synthetically
// slanted face at 100px+ shows its sheared verticals immediately, which would
// look cheap at exactly the size where it matters most. Upright and heavy is a
// worse imitation and a better typeface.
const display = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

// Labels, buttons, eyebrows. Theirs, and it does the job an all-caps condensed
// face does well: high energy at small sizes without shouting in body copy.
const label = Staatliches({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-label",
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
    <html lang="en" className={`${sans.variable} ${display.variable} ${label.variable} ${mono.variable}`}>
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
