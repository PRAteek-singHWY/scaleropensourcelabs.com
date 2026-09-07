"use client";

// The hole DevLogin sits in, and the reason it is a separate file from DevLogin itself.
//
// A component that returns null in production still SHIPS in production — the browser
// downloads it, and anybody reading the bundle finds a function that seeds `admins` with an
// owner token. That is harmless, because the endpoints it calls exist only on 127.0.0.1,
// and it is still not something to leave lying in a deployed artefact.
//
// The ternary below is what removes it. `process.env.NODE_ENV` is substituted with a
// literal at build time, so `next build` compiles this to `"production" === "production" ?
// NoDevLogin : …`, webpack marks the second branch dead, never creates the `import()`
// dependency, and no line of DevLogin.tsx reaches the bundle. Written INLINE rather than
// through a `const`, because the substitution has to be the thing being tested.
//
// ──────────────────────────────────────────────────────────────────────────────────────
// WHY NODE_ENV AND NOT THE EMULATOR VARIABLE, which is what this keyed on first and is the
// obvious choice — it is the switch DevLogin's own render guard uses, so keying the slot on
// it too would have made one condition instead of two.
//
// IT DOES NOT ELIMINATE. Next inlines a `process.env.NEXT_PUBLIC_*` reference only for a
// variable that is set to a NON-EMPTY value; an empty or absent one is left as a runtime
// property lookup on a `process` shim. So in a production build the test is not a constant,
// nothing folds, and the whole of DevLogin.tsx ships as its own chunk — measured, in
// out/_next/static/chunks/1651.*.js, complete with the `Bearer owner` header and the test
// addresses. The panel still rendered nothing, because the lookup is undefined at runtime
// and the guard held; it was simply all there to read.
//
// This is worth knowing beyond this file: `if (process.env.NEXT_PUBLIC_THING)` around
// anything you believe is stripped from production is stripping nothing whenever THING is
// empty, which is exactly the case where you assumed it was.
//
// THE TWO CONDITIONS NOW DO DIFFERENT JOBS, which is why there are two.
//   NODE_ENV here     — is this a build that could be deployed? Decides what SHIPS.
//   the emulator var  — is there an emulator to talk to? Decides what RENDERS.
// A `next build` run locally against the emulator therefore has no dev login, which is
// correct: `next dev` is where the work happens, and a deployable bundle should not carry
// this whatever it was built against.
//
// CHECKED, NOT ASSUMED — that is the whole lesson above. scripts/assert-no-dev-login.mjs
// greps the built site for DevLogin's own strings and fails the build if it finds them. It
// runs in `npm run build:static`, after next build, because this claim was false the first
// time it was made and nothing but the output settles it.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const DevLoginSlot: ComponentType =
  process.env.NODE_ENV === "production"
    ? // Not `null`: the call site renders <DevLoginSlot />, so it has to be a component.
      // The minifier inlines it there and it costs nothing.
      function NoDevLogin() {
        return null;
      }
    : dynamic(() => import("@/components/dev/DevLogin"));

export default DevLoginSlot;
