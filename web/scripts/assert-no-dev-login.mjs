// Refuse to ship a build containing the emulator dev login.
//
// components/dev/DevLogin.tsx signs you in as a test member or a test organiser by creating
// the account against the Auth emulator's admin API and writing `admins/{email}` with an
// owner token. It is fenced three ways — a render guard on NEXT_PUBLIC_FIRESTORE_EMULATOR,
// a build-time slot that compiles to null in production, and a deploy preflight that
// refuses an emulator-configured build — and none of that is worth anything unless somebody
// checks the output.
//
// WHICH IS THE POINT, because the fence leaked the first time it was built. The slot
// originally keyed on `process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR`, which reads like the
// natural switch and eliminates nothing: Next inlines a NEXT_PUBLIC_* reference only when
// the variable has a non-empty value, so an empty one stays a runtime lookup, the ternary
// never folds, and the whole component ships as its own chunk. It rendered nothing and it
// was all there to read, `Bearer owner` included. The fix was to key on NODE_ENV; this
// script is what would have caught the mistake, and what will catch the next one.
//
// It greps the built site rather than reasoning about the graph, because "is this string in
// the artefact we are about to upload" is the only question that actually matters and it is
// the one question a bundler change cannot quietly re-answer.
//
// Runs in `npm run build:static`, after next build. Milliseconds on a few hundred files.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "out");

/** Strings that exist ONLY in the dev login, chosen so a match is unambiguous.
 *
 *  Each is a literal in components/dev/DevLogin.tsx, and each would survive minification —
 *  a minifier renames identifiers and folds expressions but does not rewrite string
 *  contents. Do not add anything generic here: a false positive on a deploy is expensive,
 *  and the way this check dies is somebody disabling it after it cried wolf. */
const FORBIDDEN = [
  "Local development only",
  "dev-password-emulator-only",
  "dev.23bcs10045@sst.scaler.com",
  "Bearer owner",
];

if (!statSync(OUT, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(
    `\n  No build output at ${OUT}. This runs after next build, inside build:static.\n`,
  );
  process.exit(1);
}

/** Every file in out/, flat. Not just .js: the strings would be just as visible baked into
 *  a prerendered .html or a source map, and those are uploaded too. */
function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else out.push(p);
  }
  return out;
}

const hits = [];
for (const f of files(OUT)) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue; // a binary asset; nothing to match
  }
  for (const needle of FORBIDDEN) {
    if (text.includes(needle)) hits.push([f.slice(OUT.length + 1), needle]);
  }
}

if (hits.length) {
  console.error("\n  REFUSING TO SHIP: the emulator dev login is in the build output.\n");
  for (const [file, needle] of hits) console.error(`   - ${file}  contains  ${JSON.stringify(needle)}`);
  console.error(
    "\n  components/dev/DevLoginSlot.tsx is supposed to compile to a null component in a\n" +
      "  production build, so none of DevLogin.tsx should be reachable. Check that its\n" +
      "  condition is still something the bundler can fold to a literal — NEXT_PUBLIC_*\n" +
      "  variables cannot be, when they are empty, which is how this leaked before.\n",
  );
  process.exit(1);
}

console.log(`\n  no dev login in the build output — checked ${FORBIDDEN.length} markers\n`);
