"use client";

// Sign in as a test member or a test organiser, without the Google popup.
//
// WHY THIS EXISTS. Every signed-in screen on this site is behind Google sign-in, and
// locally that means the Auth emulator's popup — which is the least reliable thing in the
// whole development setup. It stops responding after the first successful sign-in in a
// browser: the form fills, the button is enabled, the clicks land, no console error
// appears, and the account is simply never created. It is documented at length in
// scripts/e2e-auth.mjs, which works around it by launching a whole new browser process per
// identity, because a fresh context is not enough.
//
// The cost of that is not the popup. It is that OPENING the organisers' area — seven routes
// now — took several attempts each time, so the temptation is to stop looking at it. On a
// project whose own notes say "check it in both themes, it has caught a bug every time", a
// jammed door to the thing you are meant to be looking at is a real problem.
//
// So this creates the account directly against the emulator's admin API and signs in with a
// password. No popup, no chooser, no wedge.
//
// ──────────────────────────────────────────────────────────────────────────────────────
// WHY IT CANNOT REACH PRODUCTION, which is the only thing that matters about a control that
// mints an organiser session. Four independent reasons:
//
//   1. Nothing imports this file directly. Call sites render DevLoginSlot, which compiles
//      to a literal `null` component in any production build — so the code below is not in
//      a deployed bundle at all. That claim was FALSE the first time it was made here; read
//      the note in DevLoginSlot.tsx about why, it is a trap worth knowing.
//   2. scripts/assert-no-dev-login.mjs greps the built site for the strings below and fails
//      the build if it finds them, which is what turns reason 1 from a belief into a check.
//   3. scripts/preflight-deploy.mjs REFUSES TO BUILD a deployable site with
//      NEXT_PUBLIC_FIRESTORE_EMULATOR set. It runs before next build, because NEXT_PUBLIC_*
//      values are inlined and by the time a bundle exists the mistake is already baked in.
//   4. Everything it writes goes to emulator REST endpoints on 127.0.0.1, which do not
//      exist in production — and it renders nothing at all unless that variable is set.
//
// Those endpoints take `Authorization: Bearer owner` and bypass firestore.rules entirely.
// That is correct here and would be a catastrophic thing to copy anywhere else: it is how
// the emulator lets a developer act as the database owner, and it is why this file is
// fenced the way it is. Nothing in the shipped app writes `admins` — that collection being
// unwritable by every client is the one privilege escalation the rules exist to prevent.

import { useState } from "react";

/** Empty in any real deployment, and the switch this whole file hangs on. */
const EMULATOR = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR ?? "";
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

/** Both emulators, derived from the one variable that configures Firestore's — the same
 *  derivation lib/firebase.ts makes for Auth. The ports are the firebase.json defaults. */
const HOST = EMULATOR.split(":")[0] || "127.0.0.1";
const IDENTITY = `http://${HOST}:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
const FIRESTORE = `http://${HOST}:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

/** REAL-SHAPED ADDRESSES, not `dev@sst.scaler.com`. Batch, branch and roll are parsed out
 *  of the local part by lib/batch.ts and never stored, so an address that does not match
 *  `name.YYbcsNNNNN` exercises none of that and renders an em dash everywhere a real
 *  member shows "2023–27". Two different batches so the admin breakdowns have more than
 *  one bar. */
const PEOPLE = {
  member: {
    email: "dev.23bcs10045@sst.scaler.com",
    name: "Dev Member",
    admin: false,
    to: "/dashboard",
  },
  organiser: {
    email: "dev.22bcs10002@sst.scaler.com",
    name: "Dev Organiser",
    admin: true,
    to: "/admin",
  },
} as const;

type Who = keyof typeof PEOPLE;

/** Fixed, and it does not matter: the Auth emulator stores it in clear as
 *  `fakeHash:...:password=...` and never talks to a real identity provider. */
const PASSWORD = "dev-password-emulator-only";

/** Create the account verified, or make an existing one match.
 *
 *  VERIFIED BEFORE SIGN-IN, WHICH IS THE WHOLE ORDERING. isMember() in firestore.rules
 *  requires `email_verified == true` on the token, and a password signup is unverified by
 *  default. Setting the flag AFTER signing in would leave the client holding a token minted
 *  from the old record for up to an hour, so every read would be refused — which presents
 *  as a dashboard that loads and then shows nothing, the exact failure shape this project
 *  keeps producing. Setting it first means the sign-in mints a token that is already right.
 *
 *  Returns nothing; throws with the emulator's own message if it refuses. */
async function ensureAccount(email: string, name: string) {
  const created = await fetch(`${IDENTITY}/accounts`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({
      email,
      password: PASSWORD,
      emailVerified: true,
      displayName: name,
    }),
  });
  if (created.ok) return;

  const why = (await created.json())?.error?.message ?? `HTTP ${created.status}`;
  // Anything but "you already made this one" is a real failure and must not be swallowed.
  if (why !== "EMAIL_EXISTS") throw new Error(`could not create ${email}: ${why}`);

  // It exists — from an earlier press, or from a Google sign-in in this same emulator. Reset
  // it to known values rather than assuming, because an account created through the popup
  // has no password at all and signing in would fail with a code that reads like our bug.
  const found = await fetch(`${IDENTITY}/accounts:lookup`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({ email: [email] }),
  });
  const localId = (await found.json())?.users?.[0]?.localId;
  if (!localId) throw new Error(`${email} exists but could not be looked up`);

  const updated = await fetch(`${IDENTITY}/accounts:update`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({ localId, password: PASSWORD, emailVerified: true }),
  });
  if (!updated.ok) throw new Error(`could not reset ${email}: HTTP ${updated.status}`);
}

/** Put the address in `admins`, exactly as a human does it in the Firebase console.
 *
 *  KEYED BY LOWERCASE EMAIL, because that is the id lib/auth.tsx reads back
 *  (`doc(db, ADMINS, user.email.toLowerCase())`). `role: owner` rather than a plain admin
 *  row so the roster UI — the owner-only part of the organisers' area — is reachable too;
 *  a dev login that can see six of the seven screens would leave the seventh unlooked-at,
 *  which is the problem this file is here to solve. */
async function ensureAdmin(email: string) {
  const r = await fetch(`${FIRESTORE}/admins/${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: OWNER,
    body: JSON.stringify({
      fields: {
        role: { stringValue: "owner" },
        active: { booleanValue: true },
        added_by: { stringValue: "dev login" },
      },
    }),
  });
  if (!r.ok) throw new Error(`could not seed admins/${email}: HTTP ${r.status}`);
}

export default function DevLogin() {
  const [busy, setBusy] = useState<Who | "">("");
  const [error, setError] = useState("");

  // THE GUARD, first, because everything below assumes 127.0.0.1. It answers a different
  // question from the slot's: the slot asks "could this build be deployed" and decides what
  // ships, this asks "is there an emulator to talk to" and decides what renders. So a dev
  // server with the real project's config in .env.local shows no dev login, which is right
  // — those buttons would be trying to create accounts in the club's live Firebase.
  if (!EMULATOR) return null;

  async function enter(which: Who) {
    const who = PEOPLE[which];
    setBusy(which);
    setError("");
    try {
      const { getAuthClient } = await import("@/lib/firebase");
      const auth = await getAuthClient();
      if (!auth) throw new Error("Firebase is not configured — check web/.env.local");

      await ensureAccount(who.email, who.name);
      if (who.admin) await ensureAdmin(who.email);

      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, who.email, PASSWORD);

      // A HARD NAVIGATION, NOT router.push. The admins row this may have just written is
      // read once per session by AuthProvider, and there is no reason to make the app
      // re-resolve state it only reads at boot when the whole point is to arrive on a clean
      // page. It also lands you where you were going: /admin for the organiser, and
      // /dashboard for the member — which bounces itself on to /onboarding the first time,
      // since a fresh account has no profile yet, and that is the correct first screen.
      window.location.assign(who.to);
    } catch (e) {
      console.error("[osc] dev login failed", e);
      setError(
        `${e instanceof Error ? e.message : String(e)}. Are the emulators running? ` +
          `npx firebase-tools emulators:start --only firestore,auth --project ${PROJECT}`,
      );
      setBusy("");
    }
  }

  return (
    // DASHED, AND DELIBERATELY NOT A `.card`. It should be obvious at a glance that this
    // panel is scaffolding rather than part of the product — the one thing worse than a dev
    // control on screen is a dev control that looks like it belongs there.
    <div className="mt-8 rounded-tile border border-dashed border-seam bg-sunk p-5">
      <p className="label">Local development only</p>
      <p className="mt-2 text-sm leading-relaxed text-haze">
        Sign in against the emulator without the Google popup, which stops responding after
        the first sign-in in a browser. None of this is in a deployed build: the slot around
        it compiles away under <code>next build</code>, and the build then greps its own
        output to prove it.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.keys(PEOPLE) as Who[]).map((which) => (
          <button
            key={which}
            type="button"
            onClick={() => void enter(which)}
            disabled={busy !== ""}
            className="btn btn-secondary btn-compact disabled:opacity-60"
          >
            {busy === which ? "Signing in…" : `Sign in as a test ${which}`}
          </button>
        ))}
      </div>
      {/* The addresses, because which account you are on decides what every screen shows,
          and "test organiser" does not tell you which row to look for in the roster. */}
      <p className="mt-3 font-mono text-xs leading-relaxed text-dust">
        {PEOPLE.member.email} · {PEOPLE.organiser.email}
      </p>
      {error && (
        // The emulator's own message, not a friendly rewrite of it. The reader here is
        // whoever is running the emulators, and EMAIL_EXISTS or ECONNREFUSED tells them
        // what to do; "something went wrong" does not.
        <p className="mt-3 break-words font-mono text-xs leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
