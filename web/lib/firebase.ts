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
import type { Auth } from "firebase/auth";

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
  // authDomain is in this list because SIGN-IN CANNOT WORK WITHOUT IT: signInWithPopup
  // hosts its handler on the project's auth domain, and with the value missing it throws
  // `auth/auth-domain-config-required`. It was absent from this check originally, which
  // meant a deployment with five of the six values would render a working-looking
  // "Continue with Google" button that failed on click with a generic message. Found by
  // driving the real button rather than by reading the config.
  //
  // Required even against the emulator, for the same reason — the emulator intercepts
  // the request but the SDK still validates the field first.
  if (EMULATOR) return Boolean(config.projectId && config.authDomain);
  return Boolean(
    config.apiKey && config.projectId && config.appId && config.authDomain,
  );
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

/** Guards the Auth emulator wiring, same reason as `emulatorConnected` above. */
let authEmulatorConnected = false;

/** The Auth handle, or null when Firebase is not configured.
 *
 *  Separate from getDb() and dynamically imported for the same reason: firebase/auth is
 *  another ~100KB, and the five routes with no sign-in must not carry it. */
export async function getAuthClient(): Promise<Auth | null> {
  const app = await getApp();
  if (!app) return null;
  const { getAuth, connectAuthEmulator } = await import("firebase/auth");
  const auth = getAuth(app);

  // The Auth emulator is a DIFFERENT port from Firestore's (9099 by default). Derived
  // from the Firestore host so one env var covers both, because two would inevitably
  // be set inconsistently.
  if (EMULATOR && !authEmulatorConnected) {
    const [host] = EMULATOR.split(":");
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    authEmulatorConnected = true;
    console.info(`[osc] Auth -> emulator ${host}:9099`);
  }

  return auth;
}

/** The region every Cloud Function in this project is deployed to.
 *
 *  It MUST match `setGlobalOptions` in functions/index.js. A callable invoked against
 *  the wrong region does not fall back — it 404s, and the SDK reports that as
 *  `functions/not-found`, which reads like a missing function rather than a missing
 *  region. */
export const FUNCTIONS_REGION = "asia-south1";

/** Guards the Functions emulator wiring, same reason as `emulatorConnected` above. */
let fnsEmulatorConnected = false;

/** The Functions handle, or null when Firebase is not configured.
 *
 *  Only the dashboard's "refresh my contributions" button uses this, so it is imported
 *  dynamically like the other two: a reader on /projects should not download the
 *  callable client. */
export async function getFunctionsClient() {
  const app = await getApp();
  if (!app) return null;
  const { getFunctions, connectFunctionsEmulator } = await import("firebase/functions");
  const fns = getFunctions(app, FUNCTIONS_REGION);

  // 5001 is the Functions emulator's default port, derived from the same host as the
  // other two for the reason given above getAuthClient.
  if (EMULATOR && !fnsEmulatorConnected) {
    const [host] = EMULATOR.split(":");
    connectFunctionsEmulator(fns, host, 5001);
    fnsEmulatorConnected = true;
    console.info(`[osc] Functions -> emulator ${host}:5001`);
  }

  return fns;
}

/** Collection names, in one place, so the rules file, the client and any future admin
 *  view cannot disagree about them. `npm run rules` asserts these against
 *  firestore.rules. */

/** ANONYMOUS APPLICATIONS, from people who are not members yet. One immutable document
 *  per submission, id generated by Firestore.
 *
 *  THIS WAS MARKED LEGACY FOR A WHILE and it is not. Sign-in briefly stood in front of
 *  the application form, so the profile appeared to replace this collection — but that
 *  arrangement required a college Google account before a stranger could so much as ask
 *  to join, which is the wrong way round for a club's front door. /join writes here
 *  again, with no session.
 *
 *  THE ONLY COLLECTION ANY CLIENT MAY WRITE WITHOUT SIGNING IN, which makes its rules the
 *  most important block in firestore.rules: create-only, key-bounded, size-bounded, and
 *  readable by nobody through the SDK — organisers read these in the Firebase console.
 *  App Check is what keeps a script from filling it; see the note in getApp() above. */
export const APPLICATIONS = "applications";

/** One document per registered member, keyed by the Firebase Auth uid. Keying on the
 *  uid rather than storing it as a field is what makes the ownership rule a single
 *  comparison instead of a query, and it makes a second profile per person impossible
 *  by construction. */
export const USERS = "users";

/** Membership of this collection is what makes somebody an admin. Keyed by EMAIL rather
 *  than uid so an organiser can be added from the Firebase console before they have
 *  ever signed in — with uid keys you would have to make them sign in, read their uid
 *  out of the Auth tab, and then create the document, which is a worse first day.
 *
 *  Writes are denied to every client, including admins: the list is managed by hand in
 *  the console, so a compromised admin session cannot appoint more admins. */
export const ADMINS = "admins";

/** The members-only notice board. One document per post, id generated by Firestore.
 *
 *  The ONLY collection in this app a member may list in bulk. That is safe because a
 *  post carries no personal data beyond the organiser's own byline — contrast users/,
 *  where the list rule is admin-only precisely because every row is somebody's address.
 *  If a field is ever added here that names a member, that decision has to be revisited
 *  in firestore.rules first. */
export const ANNOUNCEMENTS = "announcements";

/** GitHub counts for one member, keyed by the same Auth uid as their profile.
 *
 *  SEPARATE FROM users/{uid} RATHER THAN A FIELD ON IT, for one decisive reason: the
 *  profile is written by the member and the rules validate it with a strict `hasOnly`
 *  list. A Cloud Function writing merged-PR counts into that same document would either
 *  have to be added to that list — at which point a member could write their own
 *  contribution numbers — or would fail validation on every sync. A second collection
 *  that no client may write keeps the member's answers and GitHub's answers apart. */
export const CONTRIBUTIONS = "contributions";

/** Forms AND polls — one collection, because a poll is a form with its answers shown
 *  back. `show_tally` is the whole difference. See lib/forms.ts. */
export const FORMS = "forms";

/** Answers, as a SUBCOLLECTION of the form rather than a top-level collection keyed by
 *  "formId_uid".
 *
 *  The nesting is what lets the rules read the parent form — `get(.../forms/$(formId))`
 *  — to check that an answer only answers questions this form asks, and that it arrives
 *  while the form is open. A flat collection would have neither the formId in the path
 *  nor a way to reach the form, so both checks would have to move into the client, where
 *  they would stop being checks. */
export const RESPONSES = "responses";

/** When the club meets. Separate from the notice board because a session has a TIME and
 *  stops being upcoming, and neither is expressible as a notice — see lib/sessions.ts. */
export const SESSIONS = "sessions";

/** THE ONLY EMAIL DOMAIN THAT MAY REGISTER.
 *
 *  Enforced in three places, deliberately: the Google sign-in call passes it as a hint,
 *  lib/auth.tsx signs out anybody who arrives with another domain, and firestore.rules
 *  checks it on every read and write. Only the third one is security — the first is
 *  convenience and the second is a clear error message. If you change this, change the
 *  regex in firestore.rules too; `npm run rules` fails if they disagree. */
export const ALLOWED_EMAIL_DOMAIN = "sst.scaler.com";

/** True for an address this club will register. Case-insensitive because Google returns
 *  the address as the user typed it and nobody thinks about capitals in an email. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
