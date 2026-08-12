// Generate out/.htaccess for shared Apache hosting (GoDaddy, cPanel).
//
//   npm run build:static      # runs the export, then this
//
// WHY THIS FILE HAS TO EXIST. A static export cannot use next.config.js `headers()` or
// `redirects()` — Next says so during the build: "rewrites, redirects, and headers are
// not applied when exporting your application". So on Apache the entire
// Content-Security-Policy, HSTS, nosniff, frame-deny and Permissions-Policy simply
// vanish, and /programs starts 404ing. The site looks identical and is measurably less
// safe, which is the worst kind of regression.
//
// Everything below is generated from lib/security-headers.js, the same module
// next.config.js reads, so the two can never drift. Do not hand-edit out/.htaccess —
// it is rebuilt on every export. Change the module instead.
//
// The production policy is forced regardless of how this script was invoked: a build
// run with NODE_ENV=development must never emit an .htaccess carrying 'unsafe-eval'
// and localhost origins to a live host.

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { securityHeaders, REDIRECTS } = require(join(here, "..", "lib", "security-headers.js"));

const OUT = join(here, "..", "out");
if (!existsSync(OUT)) {
  console.error(
    "\n  No out/ directory. Run the export first:\n    STATIC_EXPORT=1 next build\n  or just: npm run build:static\n",
  );
  process.exit(1);
}

const headers = securityHeaders({ dev: false });

// Apache needs the value quoted, and none of our values contain a double quote — assert
// that rather than assume it, because a stray quote would silently truncate a policy and
// leave a half-applied CSP that looks present in curl.
for (const h of headers) {
  if (h.value.includes('"')) {
    console.error(`  Header ${h.key} contains a double quote; .htaccess cannot express it verbatim.`);
    process.exit(1);
  }
}

const lines = [
  "# GENERATED FILE — do not edit.",
  "# Rebuilt by scripts/htaccess.mjs on every `npm run build:static`.",
  "# Source of truth: web/lib/security-headers.js",
  "#",
  "# Upload the CONTENTS of out/ to the web root, including this dotfile. Many FTP",
  "# clients hide files beginning with a dot — if the headers are missing in",
  "# production, this file not having been uploaded is the first thing to check.",
  "",
  "# --- Security headers -------------------------------------------------------",
  "# Requires mod_headers, which cPanel hosts enable by default. If it is missing the",
  "# whole block is ignored SILENTLY and the site serves with no CSP at all, so verify",
  "# with:  curl -sI https://your-domain/ | grep -i content-security-policy",
  "<IfModule mod_headers.c>",
  ...headers.map((h) => `  Header always set ${h.key} "${h.value}"`),
  "</IfModule>",
  "",
  "# --- Canonical HTTPS --------------------------------------------------------",
  "# HSTS above tells browsers to use https, but only AFTER a first successful https",
  "# response. This redirect is what makes that first request happen, so the two work",
  "# together rather than either being redundant.",
  "<IfModule mod_rewrite.c>",
  "  RewriteEngine On",
  "  RewriteCond %{HTTPS} !=on",
  "  RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]",
  "</IfModule>",
  "",
  "# --- Redirects that must keep working ---------------------------------------",
  "# Generated from REDIRECTS in lib/security-headers.js.",
  "<IfModule mod_rewrite.c>",
  "  RewriteEngine On",
  ...REDIRECTS.flatMap((r) => [
    `  # ${r.from} -> ${r.to}`,
    `  RewriteRule ^${r.from.replace(/^\//, "")}/?$ ${r.to} [R=${r.permanent ? 301 : 302},L]`,
  ]),
  "</IfModule>",
  "",
  "# --- Routing ----------------------------------------------------------------",
  "# The export is built with trailingSlash, so every route is a directory containing",
  "# index.html and Apache serves it via DirectoryIndex with no rewriting needed. That",
  "# is deliberate: if this file is lost or mod_rewrite is off, the site still works and",
  "# only loses its headers, rather than 404ing on every internal link.",
  "DirectoryIndex index.html",
  "ErrorDocument 404 /404.html",
  "",
  "# Do not expose directory listings for any folder without an index.",
  "Options -Indexes",
  "",
  "# --- Caching ----------------------------------------------------------------",
  "# Next fingerprints everything under _next/static, so those are safe to cache",
  "# forever. HTML must NOT be, or a deploy leaves readers on the previous build.",
  "<IfModule mod_expires.c>",
  "  ExpiresActive On",
  "  <FilesMatch \"\\.(js|css|woff2|png|jpg|jpeg|svg|webp|avif)$\">",
  "    ExpiresDefault \"access plus 1 year\"",
  "    Header append Cache-Control \"immutable\"",
  "  </FilesMatch>",
  "  <FilesMatch \"\\.html$\">",
  "    ExpiresDefault \"access plus 0 seconds\"",
  "    Header set Cache-Control \"no-cache, must-revalidate\"",
  "  </FilesMatch>",
  "</IfModule>",
  "",
  "# --- Compression ------------------------------------------------------------",
  "<IfModule mod_deflate.c>",
  "  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml",
  "</IfModule>",
  "",
];

const path = join(OUT, ".htaccess");
writeFileSync(path, lines.join("\n"), "utf8");

// Report what was written, and prove the CSP made it in intact rather than trusting the
// write. A truncated policy is the failure this whole file exists to prevent.
const written = readFileSync(path, "utf8");
const csp = headers.find((h) => h.key === "Content-Security-Policy").value;
const ok = written.includes(csp);
console.log(`\n  wrote out/.htaccess  (${written.length} bytes, ${headers.length} headers)`);
console.log(`  CSP present and intact: ${ok ? "yes" : "NO"}`);
console.log(`  redirects emitted: ${REDIRECTS.map((r) => `${r.from} -> ${r.to}`).join(", ")}`);
if (!ok) process.exit(1);

// Guard against shipping a development policy to a live host.
for (const bad of ["'unsafe-eval'", "localhost", "127.0.0.1", "ws:"]) {
  if (written.includes(bad)) {
    console.error(`\n  REFUSING: the generated policy contains "${bad}", which is a development-only value.`);
    process.exit(1);
  }
}
console.log("  no development-only values in the policy\n");
