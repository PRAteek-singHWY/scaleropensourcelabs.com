// Firebase, initialised lazily and only when it is actually configured.
//
// WHY THE NEXT_PUBLIC_ KEYS ARE NOT A LEAK. A Firebase web config is an identifier,
// not a credential — it names the project so the SDK knows where to send requests.
// Google documents it as publishable, and it is inlined into the bundle by design.
// The security boundary is firestore.rules, which is the file worth reviewing
// carefully. Anyone reading this and reaching for a server-side proxy to "hide" the
// key would be hiding a public identifier and still relying on the same rules.
//
// EVERYTHING RETURNS null WHEN UNCONFIGURED, and that is load-bearing rather than
// defensive. This repo has no credentials committed and the site must keep building,
// rendering and passing its checks with no .env.local at all — a contributor fixing
// a typo should not have to stand up a Firebase project. So the absence of config is
// a supported state, not an error: `getDb()` returns null, and the join form tells
// the reader plainly that it is not wired up instead of pretending to submit. That
// honest-failure path already existed for the old POST endpoint and is preserved.
//
// The import is dynamic for a second reason: the Firebase SDK is ~200KB, and a
// static import would put it in the bundle of every route including the five that
// have no form. Loading it inside the submit handler means a reader who never
// submits never downloads it.

import type { FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";

/** The six values Firebase needs. All public; see the note above. */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** reCAPTCHA v3 site key for App Check. Separate because App Check is optional
 *  independently of Firebase: it cannot be exercised on localhost without a debug
 *  token, so it is configured in production and simply absent in development. */
const APP_CHECK_KEY = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_KEY ?? "";

/** Point the client at a local Firestore emulator, e.g. "127.0.0.1:8080".
 *
 *  This is how somebody works on the form WITHOUT a Firebase project at all: start the
 *  emulator, set this plus a `demo-` project id, and submissions land in a local
 *  database they can inspect at http://127.0.0.1:4000/firestore. Without it, the only
 *  way to test a real submit was against production, which means either test rows in
 *  the organisers' real applications or no testing.
 *
 *  Rules are enforced by the emulator exactly as in production, so this also exercises
 *  firestore.rules rather than bypassing it. See scripts/rules-emulator.mjs. */
const EMULATOR = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR ?? "";

/** The three values without which nothing can work. `apiKey` and `projectId` are
 *  obvious; `appId` is included because App Check and Analytics both need it and a
 *  half-filled config that initialises and then fails per-request is worse than one
 *  that declines to initialise at all. */
export function isConfigured(): boolean {
  // Against the emulator only a projectId is needed — there is no real project to
  // authenticate to, and requiring the full set would mean inventing five fake values
  // just to run locally.
  if (EMULATOR) return Boolean(config.projectId);
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let appPromise: Promise<FirebaseApp> | null = null;

async function getApp(): Promise<FirebaseApp | null> {
  if (!isConfigured()) return null;
  if (typeof window === "undefined") return null; // client-only by design

  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp: existing } = await import("firebase/app");
      // Reuse across Fast Refresh and repeat submits. Calling initializeApp twice
      // with the same name throws, and in dev this module is re-evaluated on every
      // edit — so this is not hypothetical tidiness.
      const app = getApps().length ? existing() : initializeApp(config);

      // App Check is skipped entirely against the emulator: reCAPTCHA cannot be
      // satisfied on localhost without a debug token, and the emulator does not
      // enforce attestation anyway.
      if (EMULATOR) return app;

      // App Check. Attests that requests come from this app before Firestore will
      // accept them, which is the only thing standing between a create-only public
      // collection and a script that fills it overnight. Enforcement is switched on
      // in the Firebase console; this is the client half.
      //
      // Wrapped in try/catch and never allowed to reject: if App Check fails to
      // initialise, a real applicant should still be able to apply. A hard failure
      // here would turn a spam-prevention feature into an outage.
      if (APP_CHECK_KEY) {
        try {
          const { initializeAppCheck, ReCaptchaV3Provider } = await import(
            "firebase/app-check"
          );
          initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(APP_CHECK_KEY),
            isTokenAutoRefreshEnabled: true,
          });
        } catch (err) {
          // Visible in the console for whoever is debugging, silent to the reader.
          console.warn("[osc] App Check unavailable; continuing without it.", err);
        }
      }

      return app;
    })();
  }
  return appPromise;
}

/** Guards the emulator wiring. `connectFirestoreEmulator` throws if called twice on
 *  the same instance, and `getFirestore` returns the SAME instance for an app — so
 *  without this, the second submit on a page would throw instead of writing. */
let emulatorConnected = false;

/** The Firestore handle, or null when Firebase is not configured. */
export async function getDb(): Promise<Firestore | null> {
  const app = await getApp();
  if (!app) return null;
  const { getFirestore, connectFirestoreEmulator } = await import("firebase/firestore");
  const db = getFirestore(app);

  if (EMULATOR && !emulatorConnected) {
    const [host, port] = EMULATOR.split(":");
    connectFirestoreEmulator(db, host, Number(port));
    emulatorConnected = true;
    console.info(`[osc] Firestore -> emulator ${EMULATOR} (no data leaves this machine)`);
  }

  return db;
}

/** The single collection this site writes to. Named here so the rules file, the
 *  form and any future admin view cannot disagree about it. */
export const APPLICATIONS = "applications";
