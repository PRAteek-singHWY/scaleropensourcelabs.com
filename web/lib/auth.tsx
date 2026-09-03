"use client";

// Sign-in, held in one context so every component agrees about who is signed in.
//
// GOOGLE SIGN-IN ONLY, AND RESTRICTED TO ONE DOMAIN. Email-and-password was the
// obvious alternative and was rejected for a specific reason rather than on taste: with
// a password form, anybody can register `principal@sst.scaler.com` without owning it.
// The address is the only thing this club uses to decide who is a member, so an
// unverified one is worthless. Google sign-in proves the person controls the mailbox,
// and everybody on that domain already has the account, so it is also the shorter path
// for them — one tap, no password to invent, no reset flow to build and support.
//
// THE DOMAIN IS CHECKED THREE TIMES, and only the third is security:
//
//   1. `hd` on the provider — a HINT to Google's account chooser. It filters the
//      picker; it does NOT stop a determined person choosing another account, which is
//      exactly why the other two exist. Treating `hd` as enforcement is the classic
//      mistake here.
//   2. signOut() below, immediately, if the address that came back is not on the
//      domain. This is a clear error message, not a boundary — a signed-out client can
//      still hold a valid token for a moment.
//   3. firestore.rules, on every read and write. THIS is the boundary. Even with a
//      valid Google account on another domain, the rules refuse to store or return
//      anything. Read that file if you are reviewing whether this is safe.
//
// The whole thing is client-side, because the site is a static export with no server.
// That means route-gating is cosmetic — someone can always fetch the HTML for /profile
// or /admin — and it is fine ONLY because the data is protected by rules rather than by
// hiding pages. Do not add a "protected route" and conclude the data is safe.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  ADMINS,
  ALLOWED_EMAIL_DOMAIN,
  getAuthClient,
  getDb,
  isAllowedEmail,
  isConfigured,
} from "@/lib/firebase";

type AuthState = {
  /** null once we know nobody is signed in; undefined while we do not know yet. The
   *  distinction matters: rendering "sign in" during the initial check makes every
   *  page flash a sign-in card at a member who is already signed in. */
  user: User | null | undefined;
  /** True only for an address in the ADMINS collection. undefined while unknown. */
  isAdmin: boolean | undefined;
  /** Firebase is not set up at all — no .env.local. The UI says so rather than
   *  offering a button that cannot work. */
  configured: boolean;
  busy: boolean;
  error: string;
  /** Set when the last attempt was refused for being off-domain. */
  wrongAccount: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isConfigured();
  const [user, setUser] = useState<User | null | undefined>(
    configured ? undefined : null,
  );
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** The off-domain address somebody just tried, so the card can offer "use a different
   *  account" rather than leaving them staring at a refusal. */
  const [wrongAccount, setWrongAccount] = useState("");

  // Subscribe once. onAuthStateChanged also fires on page load with the restored
  // session, which is what makes sign-in survive a refresh without us storing anything.
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    let unsub: (() => void) | undefined;

    (async () => {
      const auth = await getAuthClient();
      if (!auth || !alive) return;
      const { onAuthStateChanged, getRedirectResult } = await import("firebase/auth");

      // THE OTHER HALF OF THE REDIRECT FALLBACK. Coming back from a full-page redirect,
      // onAuthStateChanged alone would report the user and silently swallow any error
      // from the sign-in itself — so a reader who was refused mid-redirect would land on
      // a sign-in card with no explanation. This surfaces it.
      //
      // It resolves to null on an ordinary page load, which is the common case, so it
      // costs a promise and nothing else.
      try {
        await getRedirectResult(auth);
      } catch (e) {
        const code = (e as { code?: string })?.code ?? "";
        if (alive && code) {
          console.error("[osc] redirect sign-in failed", e);
          setError("Sign-in did not complete. Please try again.");
        }
      }
      unsub = onAuthStateChanged(auth, (u) => {
        if (!alive) return;
        // Belt and braces against a session restored from before a domain change, or
        // one obtained outside this UI. Same rule as at sign-in.
        if (u && !isAllowedEmail(u.email)) {
          void auth.signOut();
          setUser(null);
          setIsAdmin(false);
          setError(
            `Only @${ALLOWED_EMAIL_DOMAIN} accounts can register. You were signed out.`,
          );
          return;
        }
        setUser(u);
      });
    })();

    return () => {
      alive = false;
      unsub?.();
    };
  }, [configured]);

  // Admin status, resolved by trying to read the caller's OWN row in `admins`. The
  // rules allow exactly that one document and nothing else, so this cannot be used to
  // enumerate who the admins are. A denied read means "not an admin", which is why the
  // catch sets false rather than surfacing an error.
  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsAdmin(user === null ? false : undefined);
      return;
    }
    (async () => {
      try {
        const db = await getDb();
        if (!db || !user.email) {
          if (alive) setIsAdmin(false);
          return;
        }
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, ADMINS, user.email.toLowerCase()));
        if (alive) setIsAdmin(snap.exists());
      } catch {
        if (alive) setIsAdmin(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAdmin,
      configured,
      busy,
      error,
      wrongAccount,
      async signIn() {
        setError("");
        if (!configured) {
          setError("Sign-in is not configured on this deployment yet.");
          return;
        }
        setBusy(true);
        try {
          const auth = await getAuthClient();
          if (!auth) throw new Error("Could not reach the sign-in service");
          const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
            await import("firebase/auth");
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({
            // The domain hint, not the guard — see the note at the top of this file.
            hd: ALLOWED_EMAIL_DOMAIN,
            // ALWAYS SHOW THE ACCOUNT CHOOSER. Without this, Google silently reuses
            // whichever account the browser is already signed into — and on a shared
            // laptop, or for anybody whose default is a personal Gmail, that means being
            // refused for an account they never chose. They then have no idea what to do
            // differently, because they were never asked. Forcing the chooser turns a
            // dead end into a decision.
            prompt: "select_account",
          });

          let cred;
          try {
            cred = await signInWithPopup(auth, provider);
          } catch (popupErr) {
            const pc = (popupErr as { code?: string })?.code ?? "";
            // A CLOSED popup is the reader's decision; rethrow and let the handler below
            // stay quiet about it. Anything else means the popup could not be used at
            // all, and the right answer is a full-page redirect rather than an error.
            //
            // THIS IS THE MOBILE PATH, and it is why the fallback exists rather than
            // being defensive padding: signInWithPopup fails outright in most in-app
            // browsers (Instagram, LinkedIn) and is unreliable on iOS Safari — which is
            // where a student clicking a link in a club post actually is. Before this,
            // those readers got "your browser blocked the sign-in popup" and no way
            // forward.
            if (
              pc === "auth/popup-closed-by-user" ||
              pc === "auth/cancelled-popup-request" ||
              pc === "auth/user-cancelled"
            ) {
              throw popupErr;
            }
            console.info("[osc] popup unavailable, falling back to redirect", pc);
            // Navigates away. Execution stops here; the result is picked up by
            // getRedirectResult on the way back in.
            await signInWithRedirect(auth, provider);
            return;
          }

          if (!isAllowedEmail(cred.user.email)) {
            await auth.signOut();
            setWrongAccount(cred.user.email ?? "");
            setError(
              `${cred.user.email ?? "That account"} is not an @${ALLOWED_EMAIL_DOMAIN} address. ` +
                "Use your college account instead.",
            );
            return;
          }
          setWrongAccount("");
        } catch (e) {
          const code = (e as { code?: string })?.code ?? "";
          // A closed popup is not an error worth shouting about — the reader did it on
          // purpose. Everything else gets a plain sentence; the raw Firebase code goes
          // to the console for whoever is debugging.
          if (
            code === "auth/popup-closed-by-user" ||
            code === "auth/cancelled-popup-request"
          ) {
            setError("");
          } else if (code === "auth/network-request-failed") {
            setError("That failed on the network rather than on your account. Check your connection and try again.");
          } else if (code === "auth/operation-not-allowed") {
            // The one configuration mistake that looks like the member's fault.
            setError(
              "Google sign-in is not switched on for this project yet. An organiser needs to " +
                "enable it under Authentication → Sign-in method.",
            );
            console.error("[osc] enable the Google provider in Firebase Authentication", e);
          } else if (code === "auth/unauthorized-domain") {
            // The one configuration mistake that looks like a code bug.
            setError(
              "This site's domain is not authorised in Firebase Authentication yet. " +
                "An organiser needs to add it under Authentication → Settings → Authorized domains.",
            );
            console.error("[osc] add this origin to Firebase Auth authorized domains", e);
          } else {
            setError("Sign-in did not work. Please try again.");
            console.error("[osc] sign-in failed", e);
          }
        } finally {
          setBusy(false);
        }
      },
      async signOut() {
        setError("");
        setWrongAccount("");
        const auth = await getAuthClient();
        await auth?.signOut();
        setUser(null);
        setIsAdmin(false);
      },
    }),
    [user, isAdmin, configured, busy, error, wrongAccount],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
