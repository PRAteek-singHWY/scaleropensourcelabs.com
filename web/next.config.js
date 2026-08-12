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
// The CSP and the rest of the header set live in lib/security-headers.js, because a
// static export cannot use headers() at all and has to re-declare them in .htaccess.
// One source of truth, two emitters — see that file for why.
const { securityHeaders, REDIRECTS } = require("./lib/security-headers");

// STATIC EXPORT, opt-in via the environment rather than always on.
//
// `npm run build:static` sets it to produce plain HTML in out/ for shared Apache
// hosting. The default `npm run build` is unchanged, so CI keeps asserting a fully
// prerendered Next build and `next dev` keeps applying headers() and redirects() —
// which is how the Firebase CSP was verified in the first place.
//
// trailingSlash matters more than it looks: with it, the export writes out/join/index.html
// and Apache serves /join/ natively via DirectoryIndex. Without it the export writes
// out/join.html while every internal link points at /join, so the whole site 404s unless
// .htaccess rewrites every request. This way, if .htaccess is ignored or stripped by the
// host, the site still WORKS and merely loses its headers — a bad outcome instead of a
// catastrophic one.
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  ...(isExport ? { output: "export", trailingSlash: true } : {}),
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
  // Skipped when exporting: Next does not apply them and warns. scripts/htaccess.mjs
  // emits the same list as RewriteRules instead.
  ...(isExport
    ? {}
    : {
        async redirects() {
          return REDIRECTS.map((r) => ({
            source: r.from,
            destination: r.to,
            permanent: r.permanent,
          }));
        },
      }),

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

  // Skipped when exporting, for the same reason as redirects above.
  ...(isExport
    ? {}
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders() }];
        },
      }),
};

module.exports = nextConfig;
