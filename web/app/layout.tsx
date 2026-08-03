import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// One family across the whole site, self-hosted at build time. Instrument Sans
// rather than Inter: it has a tighter, more deliberate character and hasn't yet
// become the default every dark developer site reaches for.
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
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
