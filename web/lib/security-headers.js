// THE SECURITY HEADERS, IN ONE PLACE, because they now have to be emitted twice.
//
// next.config.js serves them through `headers()`, which covers `next dev` and any
// Next-aware host. But a STATIC EXPORT cannot use `headers()` at all — Next says so
// itself during the build: "rewrites, redirects, and headers are not applied when
// exporting your application". On shared Apache hosting (GoDaddy, cPanel) they have to
// be re-declared in .htaccess instead, which scripts/htaccess.mjs generates.
//
// So there are two consumers, and a copy of a Content-Security-Policy that nothing
// keeps in sync is a copy that rots — the version in .htaccess would silently stay on
// last month's policy while the Next one moved, and the difference would only show up
// as a form that works locally and not in production. This module is the single source
// both read.
//
// Plain CommonJS with no imports so next.config.js (CJS) and an ESM build script can
// both consume it without a bundler.

/** True while `next dev` is running. Dev needs 'unsafe-eval' for HMR and the local
 *  Firestore emulator; production must have neither. */
const isDev = process.env.NODE_ENV === "development";

/** Content-Security-Policy, assembled from the same reasoning documented at length in
 *  next.config.js. Directives that only make sense in development are appended there
 *  and never reach a generated .htaccess, which is only ever produced by a production
 *  build. */
function buildCSP({ dev = isDev } = {}) {
  return [
    "default-src 'self'",
    // next/font self-hosts its files at build time, so no font CDN is needed.
    "font-src 'self'",
    "img-src 'self' data:",
    // Next injects inline bootstrap and hydration scripts, so 'unsafe-inline' cannot be
    // dropped without nonces, and nonces need a server this site does not have.
    //
    // apis.google.com IS REQUIRED FOR SIGN-IN, and leaving it out is the expensive
    // mistake rather than a theoretical one. signInWithPopup loads
    // https://apis.google.com/js/api.js to host its auth iframe; without it the popup
    // never opens and the SDK reports a bare `auth/internal-error`. The page renders
    // perfectly, the button is there, the click does nothing, and the only explanation
    // is a CSP violation in a console nobody has open. Found exactly that way.
    //
    // google.com/gstatic.com are App Check's reCAPTCHA v3 loader.
    [
      "script-src 'self' 'unsafe-inline'",
      "https://apis.google.com",
      "https://www.google.com/recaptcha/",
      "https://www.gstatic.com/recaptcha/",
      dev ? "'unsafe-eval'" : "",
    ]
      .filter(Boolean)
      .join(" "),
    "style-src 'self' 'unsafe-inline'",
    // The join form writes to Firestore over fetch/WebChannel from the browser. A
    // missing connect-src here does not fail the build, any screenshot, or the smoke
    // test — the page renders perfectly and only the submit is dead.
    [
      "connect-src 'self'",
      "https://firestore.googleapis.com",
      "https://*.googleapis.com",
      // 127.0.0.1 as well as localhost: they are NOT interchangeable to CSP, and the
      // Firestore emulator binds 127.0.0.1.
      dev ? "ws: http://localhost:* http://127.0.0.1:*" : "",
    ]
      .filter(Boolean)
      .join(" "),
    // Frames, and there are three different reasons for the entries here:
    //
    //   www.google.com          App Check's reCAPTCHA provider iframe.
    //   accounts.google.com     the Google account chooser.
    //   <authDomain>            Firebase Auth hosts its sign-in handler on the
    //                           project's own authDomain, in a hidden iframe. Derived
    //                           from the env var so it is right per project rather than
    //                           hardcoded to one, with a wildcard fallback for a build
    //                           that has no config — which is every contributor's build,
    //                           and must not produce a policy that only works for us.
    //   127.0.0.1 / localhost   dev only. The Auth EMULATOR serves the same sign-in
    //                           handler from http://127.0.0.1:9099, and Firebase frames
    //                           it. Without these, sign-in cannot be tested locally at
    //                           all: the popup opens, closes, and the page stays signed
    //                           out with only a framing violation in the console.
    [
      "frame-src 'self'",
      "https://www.google.com",
      "https://accounts.google.com",
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        ? `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`
        : "https://*.firebaseapp.com",
      dev ? "http://localhost:* http://127.0.0.1:*" : "",
    ]
      .filter(Boolean)
      .join(" "),
    // The form writes over fetch rather than POSTing, so this stays at 'self'.
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // WebKit honours this on localhost where Chromium and Firefox exempt it, so in dev
    // over http every asset is upgraded to https://localhost, hits a TLS error, and
    // Safari gets no CSS, fonts or JavaScript — a blank-looking page.
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** The full header set as {key, value} pairs, in the shape next.config.js wants.
 *  `dev` is a parameter rather than read from the environment so the .htaccess
 *  generator can force the production policy regardless of how it was invoked. */
function securityHeaders({ dev = isDev } = {}) {
  return [
    { key: "Content-Security-Policy", value: buildCSP({ dev }) },
    // Two years, subdomains included. Safe here: the domain serves only this site and
    // there is no plaintext service to break.
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Origin only when leaving the site, full path within it — so a click through to
    // GitHub does not leak which section the reader came from.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // frame-ancestors supersedes this in modern browsers; kept for older ones.
    { key: "X-Frame-Options", value: "DENY" },
    // The page asks for none of these, so deny them rather than leave the defaults
    // available to anything injected.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
}

/** Routes that must keep working after the URL they originally shipped under changed.
 *  Emitted by next.config.js as `redirects()` and by the .htaccess generator as
 *  RewriteRules, for the same don't-let-them-drift reason as the headers. */
const REDIRECTS = [
  { from: "/programs", to: "/programmes", permanent: true },
];

module.exports = { buildCSP, securityHeaders, REDIRECTS, isDev };
