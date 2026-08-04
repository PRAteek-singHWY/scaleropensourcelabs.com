/** @type {import('next').NextConfig} */

// Security headers live here rather than in vercel.json on purpose: this way they
// apply in `next dev` and on any host, not only on Vercel. A header set in a
// platform config file is one nobody sees locally and nobody notices when the
// platform changes.
//
// This is a static, credential-free page with one outbound form POST, so the policy
// can be genuinely strict rather than the permissive boilerplate that usually ships.
const CSP = [
  "default-src 'self'",
  // next/font self-hosts its files at build time, so no font CDN is needed.
  "font-src 'self'",
  "img-src 'self' data:",
  // Next injects inline bootstrap and hydration scripts, so 'unsafe-inline' cannot
  // be dropped without nonces — and nonces need a server we deliberately do not
  // have. Constrained to self otherwise.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind emits one stylesheet; the inline styles are the theme tokens and the
  // handful of computed values in components.
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  // Where a <form> is allowed to submit. This is the one that matters: with it set,
  // a script injected into the page cannot repoint the join form somewhere else and
  // harvest applications. Derived from the configured endpoint so it stays correct.
  `form-action 'self'${
    process.env.NEXT_PUBLIC_APPLY_ENDPOINT
      ? ` ${new URL(process.env.NEXT_PUBLIC_APPLY_ENDPOINT).origin}`
      : ""
  }`,
  // Nothing here should ever be framed or embedded.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // Two years, subdomains included. Safe here: the domain serves only this
          // site and there is no plaintext service to break.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Origin only when leaving the site, full path within it — so a click
          // through to GitHub or a programme site does not leak which section the
          // reader came from.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // frame-ancestors supersedes this in modern browsers; kept for the older
          // ones that only understand the header.
          { key: "X-Frame-Options", value: "DENY" },
          // The page asks for none of these, so deny them rather than leave the
          // defaults available to anything injected.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
