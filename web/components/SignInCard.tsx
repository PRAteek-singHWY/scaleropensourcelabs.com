"use client";

// SIGN-IN. Its own feature, on its own card, answering exactly one question: is this
// person a student at this college.
//
// IT USED TO BE STEP ONE OF THE JOIN FORM, and pulling it out is the point of this file
// rather than a tidy-up. On /join it stood in front of the application form, so a
// stranger could not apply to the club without already holding a college Google account
// — which inverted the club's own front door and contradicted the headline beside it.
// Applying is now anonymous (components/ApplyForm.tsx) and this card guards only the
// members' area, which is the one thing that genuinely needs to know who you are.
//
// WHAT WENT WITH THE SPLIT, and why its absence is correct:
//
//   THE STEP SPINE. This card carried an "01 Sign in / 02 Your details" spine, because
//   it was the first half of a two-step signup. There is no step two here any more —
//   signing in is a single act with a single outcome, and a spine numbering one step is
//   a progress indicator that only ever says "you are at the beginning of nothing". The
//   profile form it used to lead to is now reached from the dashboard, which shows its
//   own state without needing to count.
//
// WHAT DELIBERATELY STAYED:
//
//   THE DOMAIN, ON A RULE. A hairline with the domain sitting in the break of it: the
//   loudest colour on the site spent on the shortest possible string, which is the one
//   string a reader cannot afford to skim past. It replaced a full yellow panel saying
//   the same thing in three lines — the panel was carrying the explanation as well as
//   the fact, and the explanation belongs in the box below it, which is built to hold it.
//
//   THE CARD'S QUIET EDGE. It keeps `.card`'s pale border and diffuse shadow rather than
//   a black keyline, because this stylesheet's rule is that controls get the hard shadow
//   and content panels do not — "if everything wore the hard shadow the page would be a
//   wall of outlines with nothing to press". The button is the only thing here you can
//   press, so it is the only thing wearing the keyline.
//
// THIS IS NOT A PRIVILEGE GATE. Anybody can fetch the page this renders on and read its
// markup; the site is a static export and there is no server to refuse them. What refuses
// a stranger is firestore.rules. See the header of lib/auth.tsx before concluding that a
// hidden page on this site is a safe one.

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { DOMAIN } from "@/lib/profile";
import { LINKS } from "@/content/site";

/** The plate's edge: the black keyline, and DELIBERATELY NOT the offset shadow.
 *
 *  The hard shadow marks a CONTROL in this stylesheet — "controls get a black keyline
 *  and an unblurred shadow, content panels get a pale border and a diffuse one" — so two
 *  identical objects where exactly one is pressable is the ambiguity that rule exists to
 *  prevent. The keyline keeps the plate loud; the shadow belongs to the button alone.
 *
 *  Costs nothing in dark mode: on a #141822 card a black keyline and a black shadow are
 *  both close to invisible, and the yellow fill was already carrying the shape. */
const PLATE = "border-2 border-black";

/** The button's working state.
 *
 *  Not decoration: signInWithPopup can take a second or two to open anything, and on the
 *  redirect path the page is about to be replaced entirely. Without a moving indicator
 *  the reader's read is "my click did nothing", and the thing they do next is click again
 *  — which is how you get `auth/cancelled-popup-request`.
 *
 *  Under prefers-reduced-motion the global block at the foot of globals.css zeroes the
 *  duration, so this parks as a static ring and the label carries the meaning on its own.
 *  That is the correct outcome, not a degradation. */
function Spinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* A three-quarter arc rather than a full circle — a spinning full circle is
          indistinguishable from a stationary one. */}
      <path d="M8 1.5a6.5 6.5 0 1 1-6.5 6.5" strokeLinecap="round" />
    </svg>
  );
}

/** A mortarboard, because the rule this panel explains is "are you at this college".
 *  Inline rather than an icon font or an SVG file: the CSP is `img-src 'self' data:` and
 *  `font-src 'self'`, so anything fetched from elsewhere would be blocked, and one path
 *  is not worth a dependency. */
function CapIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" />
    </svg>
  );
}

export default function SignInCard() {
  const { configured, busy, error, wrongAccount, signIn } = useAuth();

  // ---------------------------------------------------------------- not configured
  // No Firebase project, so there is nothing to sign in to. Says so rather than
  // rendering a button that cannot work.
  //
  // NOTE THE ASYMMETRY WITH ApplyForm, WHICH IS DELIBERATE. That form renders its fields
  // even unconfigured, because a contributor working on its copy or its spacing needs to
  // see them and the fields are the page. Here the button IS the page, and a button that
  // is guaranteed to fail is worse than a sentence explaining why it is absent.
  if (!configured) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <p className="text-display-md font-semibold">Sign-in is not set up here.</p>
        <p className="measure mt-4 text-body text-haze">
          This deployment has no Firebase configuration, so there is nothing for this page
          to show. If you are running the site locally, see <code>web/.env.example</code>.
          If you are seeing this on the live site, that is a bug — please tell us.
        </p>
        {/* THE APPLICATION FORM STILL WORKS WITHOUT ANY OF THIS, and saying so is the
            whole reason the two features were separated. A reader who arrived here trying
            to join should not conclude the club is closed because the members' door is
            unwired. */}
        <p className="measure mt-4 text-body text-haze">
          Applying does not need any of this, though —{" "}
          <Link href="/join" className="link-u text-accent">
            the application form
          </Link>{" "}
          asks for no account at all.
        </p>
        <a href={`mailto:${LINKS.email}`} className="btn btn-secondary mt-6">
          Email the organisers
        </a>
      </div>
    );
  }

  return (
    <div className="card rounded-panel bg-raise p-8 sm:p-10">
      <p className="chip">Members only</p>

      {/* h1, NOT h2. This card IS the whole page for a signed-out reader on /dashboard —
          the route's app shell carries no banner heading of its own, so without this the
          document has no h1 at all and a screen reader gets a page with no title. The
          signed-in half of the same route puts its h1 on the greeting, for the same
          reason: exactly one, on whatever the reader actually came for. */}
      <h1 className="mt-4 font-display text-display-md font-bold tracking-tight">
        Sign in with your college account
      </h1>
      <p className="measure mt-3 text-body text-haze">
        Use your college Google account to continue.
      </p>

      {/* FULL WIDTH, and it is the only control on the card, so it gets the whole column
          rather than sitting inline at its own text width. A single primary action that
          spans its container is unmissable and is a bigger tap target on a phone than the
          same label with padding around it. */}
      {/* NOT DISABLED WHILE BUSY, AND THAT IS THE FIX RATHER THAN AN OVERSIGHT.
          signInWithPopup does not reject promptly when somebody closes the Google window —
          it polls for closure, and measured here it took five to seven seconds to settle.
          A `disabled={busy}` therefore left the only control on the card dead for seven
          seconds after the reader closed the chooser to pick a different account, which is
          well past the point where somebody decides the site is broken and reloads.
          Clearing `busy` on window focus was tried first and abandoned: the focus event
          never arrived when the popup closed, so the fix could not be verified, and
          unverifiable code is worse than none.
          Leaving it pressable is safe because the code below already anticipates a second
          press — `auth/cancelled-popup-request` is one of the two codes the error handler
          swallows deliberately. Firebase cancels the stale attempt and opens a fresh
          chooser, which is exactly what the reader is asking for.
          aria-busy carries the state for a screen reader; the spinner and the label carry
          it for everybody else. */}
      <button
        type="button"
        onClick={() => void signIn()}
        aria-busy={busy}
        className="btn btn-primary mt-7 w-full gap-2.5"
      >
        {/* Three labels, because there are three states and they mean different things.
            "Redirecting to Google" is what is actually happening — the popup or the
            full-page redirect is being opened — and saying so is what stops a reader
            clicking twice.
            The refused label is the one that took a bug report to get right: pressing
            "Continue with Google" again reads like it will repeat what just failed, when
            in fact the chooser reopens and a different account can be picked. */}
        {busy ? (
          <>
            <Spinner />
            Redirecting to Google…
          </>
        ) : wrongAccount ? (
          "Choose a different account"
        ) : (
          "Continue with Google"
        )}
      </button>

      {error && (
        <div className="mt-5" role="alert">
          <p className="text-[15px] leading-relaxed text-ember">{error}</p>
          {/* A REFUSAL USED TO BE A DEAD END. Somebody signed into a personal Gmail on a
              shared laptop was told their address was wrong and left looking at the same
              button, with no hint that the fix is to pick another account. The button
              above now says so, and this line names what to look for. */}
          {wrongAccount && (
            <p className="mt-2 text-[15px] leading-relaxed text-dust">
              You signed in as{" "}
              <span className="font-mono text-haze">{wrongAccount}</span>. Press the button
              again and pick your college account from the list — Google will ask which one
              to use.
            </p>
          )}
        </div>
      )}

      {/* THE RULE, ON THE RULE. See the header for why this is a pill in a hairline and
          not the yellow panel it replaced. */}
      <div className="mt-8 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-seam" />
        <span
          className={`${PLATE} rounded-full bg-pop px-3 py-1 font-mono text-[0.8125rem] font-bold uppercase tracking-wider text-black`}
        >
          @{DOMAIN}
        </span>
        <span className="h-px flex-1 bg-seam" />
      </div>
      {/* The pill above is aria-hidden because it is a graphic restatement of the sentence
          in the panel below — a screen reader hearing "at sst dot scaler dot com" with no
          verb attached learns nothing it is not about to be told. */}

      <div className="mt-6 rounded-tile border border-edge bg-sunk p-5">
        <div className="flex gap-4">
          {/* A FILLED ACCENT TILE, and the first attempt was --accent-soft on the
              reasoning that a saturated square would out-shout the heading beside it.
              Measured, that reasoning was wrong in the only way that matters: the icon on
              the soft tile came out at a comfortable 6.3:1, but the TILE against the panel
              behind it was 1.02:1 in light and 1.23:1 in dark. There was no tile — just an
              icon floating in the corner of the box.
              36px, not 40: enough to read as a tile, small enough not to argue with the
              heading beside it. */}
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent text-bg">
            <CapIcon />
          </span>
          <div>
            <h3 className="font-semibold text-ink">Who can sign in</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-haze">
              Students with an <strong className="text-ink">@{DOMAIN}</strong> address. No
              other address can register, and that is the whole check — no fee, no
              interview, no prior experience.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-haze">
              We use Google rather than a password so nobody can register an address they
              do not own, and so you have no password to invent or lose. We never see your
              password.
            </p>
            {/* THE ONE SENTENCE THIS PANEL GAINED IN THE SPLIT, and it is the sentence
                that makes the closed door defensible. While this card stood in front of
                the application form, "no other address can register" also meant "nobody
                else can even ask", which is a different and much harsher claim than the
                club intends. Now it is only about the members' area, and pointing at the
                open form is what keeps the restriction honest. */}
            <p className="mt-3 text-[15px] leading-relaxed text-haze">
              Not a member yet? You do not need an account to apply —{" "}
              <Link href="/join" className="link-u text-accent">
                the application form
              </Link>{" "}
              is open to anyone.
            </p>
          </div>
        </div>
      </div>

      {/* NO "NO COLLEGE ACCOUNT?" FALLBACK. A closed door invites a bell, but the door is
          the point here: an @sst.scaler.com address IS the membership test, so somebody
          without one is not a student here. The footer carries the organisers' address on
          every page for anyone who genuinely needs to reach the club — and the line above
          now points anybody who simply wanted to join at the form that will take them. */}

      {/* THE THREE LINKS GO TO A PAGE THAT EXISTS. Google will not publish an OAuth
          consent screen without a reachable privacy policy, and a sign-in card is the one
          screen where "what happens to my details" is a live question rather than a
          formality — so they are anchors into the three sections of /privacy that answer
          it, not three separate documents we do not have. */}
      <div className="mt-8 border-t border-seam pt-5 text-center">
        {/* .tap on each link, and gap-y-2 to pay for it. The QA sweep measured these at
            51x23, 42x23 and 96x23 — every one under the 44px touch floor, on both themes
            at mobile. `.tap` is this stylesheet's fix for exactly that: 14px of vertical
            padding with a matching negative margin, so the target grows to 44px and
            nothing moves on screen.
            THE SEPARATORS ARE BORDERS, NOT PIPE CHARACTERS. A "|" glyph in --seam measured
            1.47:1 in light and 1.34:1 in dark against the 4.5 floor, and the honest
            reading of that is not "it is decorative, exempt it" — it is that a separator
            is a rule, and a rule drawn as text has to meet a text contrast bar it was never
            trying to meet. Drawn as a 1px border it is a rule, the checker treats it as
            one, and it looks the same. */}
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[15px]">
          <Link href="/privacy#what-we-store" className="tap link-u text-haze">
            Privacy
          </Link>
          <span aria-hidden className="h-4 w-px bg-seam" />
          <Link href="/privacy#terms" className="tap link-u text-haze">
            Terms
          </Link>
          <span aria-hidden className="h-4 w-px bg-seam" />
          <Link href="/privacy#data-deletion" className="tap link-u text-haze">
            Data deletion
          </Link>
        </p>
        {/* The club, not the university. The club runs this site and owns what is on it;
            SST is where its members study, and signing their name to a student project
            would be claiming an endorsement nobody gave. */}
        <p className="mt-3 text-[0.8125rem] text-dust">
          © {new Date().getFullYear()} Scaler Open Source Club, a student club at Scaler
          School of Technology.
        </p>
      </div>
    </div>
  );
}
