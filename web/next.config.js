/** @type {import('next').NextConfig} */

// Security headers live here rather than in vercel.json on purpose: this way they
// apply in `next dev` and on any host, not only on Vercel. A header set in a
// platform config file is one nobody sees locally and nobody notices when the
// platform changes.
//
// This is a static site with one outbound write — the join form, into Firestore —
// so the policy can be genuinely strict rather than the permissive boilerplate that
// usually ships. It used to say "credential-free page with one outbound form POST",
// which stopped being true when the form started writing to a database; see the
// connect-src note below for what that costs and why the origins are listed one by
// one rather than waved through with a blanket https:.
// Next's dev server compiles with eval for HMR. Blocking 'unsafe-eval' therefore
// does not merely warn in dev — it stops the dev bundle executing, so nothing
// hydrates and every contributor running `npm run dev` gets a dead page.
//
// I saw this violation, confirmed production was clean, and concluded the policy was
// safe. Production being clean was true; "therefore safe" was not. Dev is where all
// the work happens.
//
// So the exception is scoped to development and production keeps the strict policy.
// The CI pipeline would also have caught this — it boots `next dev` and runs the
// smoke test, which asserts hydration — but it should not have had to.
const isDev = process.env.NODE_ENV === "development";


const CSP = [
  "default-src 'self'",
  // next/font self-hosts its files at build time, so no font CDN is needed.
  "font-src 'self'",
  "img-src 'self' data:",
  // Next injects inline bootstrap and hydration scripts, so 'unsafe-inline' cannot
  // be dropped without nonces — and nonces need a server we deliberately do not
  // have. Constrained to self otherwise.
  // www.google.com/gstatic.com are App Check's reCAPTCHA v3 loader. Without them the
  // provider cannot initialise, App Check issues no token, and — once enforcement is
  // on in the console — every write is rejected. The client code tolerates App Check
  // failing (see lib/firebase.ts) so this degrades to "no attestation" rather than a
  // dead form, but with enforcement enabled that still means no submissions.
  [
    "script-src 'self' 'unsafe-inline'",
    "https://www.google.com/recaptcha/",
    "https://www.gstatic.com/recaptcha/",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" "),
  // Tailwind emits one stylesheet; the inline styles are the theme tokens and the
  // handful of computed values in components.
  "style-src 'self' 'unsafe-inline'",
  // FIREBASE NEEDS THESE ORIGINS, and getting this wrong is the expensive mistake on
  // this project rather than a theoretical one. The join form talks to Firestore with
  // fetch/WebChannel from the browser, so a missing connect-src does not fail at
  // build, does not fail in any screenshot, and does not fail the smoke test — the
  // page renders perfectly and only the submit is dead, reported in the console as a
  // CSP violation nobody is looking at. The CSP in this file has already silently
  // broken Safari once.
  //
  //   firestore.googleapis.com  — the database itself
  //   *.googleapis.com          — App Check's token exchange
  //
  // Listed explicitly rather than as a blanket https: because the whole argument for
  // this policy is that it is genuinely strict. Verified by driving a real submit and
  // confirming the write reaches firestore.googleapis.com with zero violations.
  [
    "connect-src 'self'",
    "https://firestore.googleapis.com",
    "https://*.googleapis.com",
    // 127.0.0.1 as well as localhost, and they are NOT interchangeable to CSP: the
    // Firestore emulator binds 127.0.0.1, so a policy allowing only `localhost:*`
    // blocks it — the form would fail locally in the one setup meant for testing it.
    isDev ? "ws: http://localhost:* http://127.0.0.1:*" : "",
  ]
    .filter(Boolean)
    .join(" "),
  // App Check's reCAPTCHA provider loads an iframe from Google. Needed only when
  // NEXT_PUBLIC_FIREBASE_APPCHECK_KEY is set, but the policy is static and cannot
  // branch per-request, so it is always allowed. The alternative — a policy correct
  // only when a particular env var happens to be present — breaks in production and
  // nowhere else.
  "frame-src 'self' https://www.google.com",
  // Where a <form> is allowed to submit. Kept at 'self': the form no longer POSTs
  // anywhere. It writes to Firestore over fetch, which connect-src governs, so this
  // stays as tight as it can be. It previously widened itself to whatever
  // NEXT_PUBLIC_APPLY_ENDPOINT pointed at; with that endpoint gone, so is the hole.
  "form-action 'self'",
  // Nothing here should ever be framed or embedded.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Production only. WebKit honours this on localhost where Chromium and Firefox
  // exempt it, so in dev over http every asset request was upgraded to
  // https://localhost, hit a TLS error, and Safari got no CSS, no fonts and no
  // JavaScript at all — a completely blank-looking page. Found by finally running
  // the suite in WebKit rather than Chromium alone.
  //
  // It costs nothing to drop here: every sub-resource on this site is same-origin,
  // so over https they are already https, and CSP restricts everything to 'self'
  // anyway. Kept in production as standard hardening.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig = {
  reactStrictMode: true,

  // The programmes route is spelled the way the rest of the site spells the word.
  // club.ts is uniformly British — PROGRAMMES, PROGRAMME_NAME, "Programme and
  // organisation names are trademarks…" — and a nav item reading "Programmes" that
  // lands on /programs is the kind of small inconsistency a reader notices without
  // being able to name.
  //
  // The American slug was the one the multi-page structure originally shipped with,
  // so it is redirected rather than dropped: any link already written against it —
  // in a commit message, a Slack thread, someone's bookmarks — still arrives. 308,
  // so it is cached and the method is preserved.
  async redirects() {
    return [{ source: "/programs", destination: "/programmes", permanent: true }];
  },

  // Webpack's on-disk cache loses this project on Windows, and the way it fails is
  // what makes it expensive rather than merely slow: nothing crashes. The dev server
  // stays up, the terminal shows no error, and every route quietly starts returning
  // 404 — including routes that were serving 200 a second earlier. The log has the
  // whole sequence:
  //
  //   <w> [webpack.cache.PackFileCacheStrategy] Caching failed for pack:
  //       Error: ENOENT ... .next\cache\webpack\client-development\1.pack.gz
  //   ✓ Compiled /programmes in 250ms (296 modules)   <- had been 740 modules
  //   GET / 404
  //
  // A pack file goes missing mid-write, webpack restores a partial module graph, the
  // route tree comes back nearly empty, and it never recovers on its own.
  //
  // Restarting `next dev` DOES NOT FIX IT, which is the part that costs an afternoon.
  // The damage is in .next/cache, not in the process, so a fresh server reads the bad
  // cache straight back in and 404s identically. Deleting .next by hand is the only
  // thing that appears to work, so the loop becomes: restart, still broken, restart
  // again, eventually delete .next, forget why, and meet it again next week.
  //
  // The disk cache only buys a faster cold start. In dev it is kept in memory instead
  // — one slower first compile, and no pack files to lose. Production builds keep the
  // disk cache untouched; this branch is dev-only.
  webpack: (config, { dev }) => {
    if (dev) config.cache = { type: "memory" };
    return config;
  },

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
