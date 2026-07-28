import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Self-hosted at build time by next/font — no runtime font requests, so no layout
// shift and nothing third-party to block first paint.
const display = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://scaleropensourcelabs.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Scaler Open Source Club",
    template: "%s · Scaler Open Source Club",
  },
  description:
    "Scaler students contributing to real open-source projects. Every number here comes from work a maintainer actually merged.",
  openGraph: {
    type: "website",
    siteName: "Scaler Open Source Club",
    title: "Scaler Open Source Club",
    description:
      "Scaler students contributing to real open-source projects. Every number here comes from work a maintainer actually merged.",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
