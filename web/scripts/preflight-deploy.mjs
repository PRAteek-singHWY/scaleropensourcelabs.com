// Refuse to build a deployable site that is wired to the emulator.
//
// Runs FIRST in `npm run build:static`, before next build, because by the time the
// bundle exists the mistake is already baked in: NEXT_PUBLIC_* values are inlined at
// build time, so a build run with the emulator env set produces a site whose join form
// talks to 127.0.0.1. Deployed, that is a form which renders perfectly and silently
// cannot save anything — the exact failure shape this project keeps producing.
//
// It is a real trap rather than a hypothetical one: the same .env.local is used to point
// the dev server at the emulator for testing, and the file survives between a test run
// and a deploy. I nearly shipped it.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ENV = join(here, "..", ".env.local");

// Read the file rather than process.env: next build loads .env.local itself, so the
// values that will be baked in are the ones in the file, not the ones in this shell.
const env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] ?? "").trim();

const project = get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const emulator = get("NEXT_PUBLIC_FIRESTORE_EMULATOR");
const problems = [];

if (emulator) {
  problems.push(
    `NEXT_PUBLIC_FIRESTORE_EMULATOR is set to "${emulator}". A deployed site cannot ` +
      "reach an emulator on your machine; the join form would fail silently.",
  );
}
if (project.startsWith("demo-")) {
  problems.push(
    `NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${project}". A demo- prefix makes the SDK ` +
      "refuse to reach real Google services, by design — it is for local testing only.",
  );
}
if (!existsSync(ENV) || !project) {
  problems.push(
    "No Firebase project id. The site will build, but the join form will tell every " +
      "visitor it is not connected. If that is genuinely what you want, run " +
      "`STATIC_EXPORT=1 next build` directly and skip this check.",
  );
}

if (problems.length) {
  console.error("\n  REFUSING TO BUILD A DEPLOYABLE SITE:\n");
  for (const p of problems) console.error(`   - ${p}`);
  console.error(
    "\n  Fix web/.env.local to the real project's six values, with " +
      "NEXT_PUBLIC_FIRESTORE_EMULATOR empty, and run again.\n",
  );
  process.exit(1);
}

console.log(`\n  preflight ok — building against Firebase project "${project}"\n`);
