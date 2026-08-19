// Write the Firebase Hosting block into firebase.json from lib/security-headers.js.
//
//   node scripts/hosting-config.mjs        (run for you by `npm run build:static`)
//
// WHY THIS IS GENERATED RATHER THAN HAND-WRITTEN. The security headers now have THREE
// emitters: next.config.js `headers()` for dev and any Next host, out/.htaccess for
// Apache, and this block for Firebase Hosting. Firebase ignores .htaccess completely —
// it is not Apache — so a site deployed there with only the .htaccess would serve with
// no Content-Security-Policy at all, and nothing would say so.
//
// Three hand-maintained copies of a CSP is three things to forget. All three are now
// derived from one module, and this script rewrites the block on every static build, so
// firebase.json cannot fall behind. Do not hand-edit hosting.headers — it is
// regenerated.
//
// Idempotent: running it twice produces the same file, so it is safe in a build step.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { securityHeaders, REDIRECTS } = require(join(here, "..", "lib", "security-headers.js"));

// READ .env.local, NOT process.env. `next build` loads that file itself, so the values
// baked into the bundle live there — this script runs as a plain node process and sees
// none of them. Without this the auth domain fell back to a `https://*.firebaseapp.com`
// wildcard in frame-src: functional, since it still covers the real domain, but broader
// than it needs to be on a policy whose whole argument is that it is strict.
const ENV = join(here, "..", ".env.local");
const envFile = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const fromEnvFile = (k) =>
  (envFile.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] ?? "").trim();

const CONFIG = join(here, "..", "..", "firebase.json");
const config = JSON.parse(readFileSync(CONFIG, "utf8"));

// The production policy, forced: a build run with NODE_ENV=development must never ship
// 'unsafe-eval' or localhost origins to a live host.
const headers = securityHeaders({
  dev: false,
  authDomain: fromEnvFile("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
});

config.hosting = {
  // Relative to the repo root, where firebase.json lives.
  public: "web/out",

  // Never deploy build noise or the Apache file. .htaccess is kept in out/ so the site
  // can still be dropped on shared hosting, but Firebase would serve it as a plain text
  // file at /.htaccess — harmless, since it contains no secrets, but it is not part of
  // the site and there is no reason to publish it.
  ignore: ["firebase.json", "**/.*", "**/node_modules/**"],

  // MATCHES THE EXPORT, which is built with Next's trailingSlash. Every route is a
  // directory containing index.html, so /join/ is served directly and /join is
  // redirected to it. `cleanUrls` is deliberately NOT set: it strips .html from
  // filenames, which is the wrong tool for a directory layout and would fight this.
  trailingSlash: true,

  // Single-page rewrites are deliberately absent. Every route is prerendered to its own
  // file, so a catch-all rewrite would mask a genuinely missing page as the home page.
  appAssociation: "NONE",

  headers: [
    {
      // Every response, including the HTML documents.
      source: "**",
      headers: headers.map((h) => ({ key: h.key, value: h.value })),
    },
    {
      // Next fingerprints everything under _next/static, so it is immutable and safe to
      // cache for a year. Firebase's default for hosted assets is one hour, which throws
      // away most of the benefit of the content hashes.
      source: "/_next/static/**",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      // HTML must NOT be cached, or a deploy leaves readers on the previous build with
      // no way to know. This has to come after the block above or it would override it.
      source: "**/*.html",
      headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
    },
  ],

  // Same list next.config.js uses, so a URL that once shipped keeps working.
  redirects: REDIRECTS.map((r) => ({
    source: r.from,
    destination: r.to,
    type: r.permanent ? 301 : 302,
  })),
};

writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n", "utf8");

// Prove what was written rather than trusting it — a truncated CSP still looks present.
const back = JSON.parse(readFileSync(CONFIG, "utf8"));
const csp = back.hosting.headers[0].headers.find((h) => h.key === "Content-Security-Policy");
const expected = headers.find((h) => h.key === "Content-Security-Policy").value;
console.log(`\n  wrote hosting config -> firebase.json`);
console.log(`  public: ${back.hosting.public}   trailingSlash: ${back.hosting.trailingSlash}`);
console.log(`  headers: ${back.hosting.headers[0].headers.length} on every response`);
console.log(`  CSP matches lib/security-headers.js: ${csp?.value === expected ? "yes" : "NO"}`);
console.log(`  redirects: ${back.hosting.redirects.map((r) => `${r.source} -> ${r.destination}`).join(", ")}`);

if (csp?.value !== expected) process.exit(1);
for (const bad of ["'unsafe-eval'", "localhost", "127.0.0.1", "ws:"]) {
  if (csp.value.includes(bad)) {
    console.error(`\n  REFUSING: policy contains development-only value "${bad}".`);
    process.exit(1);
  }
}
console.log("  no development-only values in the policy\n");
