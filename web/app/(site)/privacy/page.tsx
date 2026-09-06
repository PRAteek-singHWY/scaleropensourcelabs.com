import type { Metadata } from "next";
import Link from "next/link";
import { LINKS } from "@/content/site";
import { DOMAIN } from "@/lib/profile";

// WHY THIS PAGE EXISTS, AND WHY IT IS NOT BOILERPLATE.
//
// The sign-in card links to it three times — Privacy, Terms, Data deletion — and a
// sign-in card with three dead links is worse than one with none. But it is not only
// there to make links resolve: Google requires a reachable privacy policy URL before an
// OAuth consent screen can be published, and an app that asks a student for their
// college identity and then stores it owes them a plain answer about what it kept.
//
// EVERY CLAIM HERE IS CHECKABLE AGAINST THE CODE, and it is written that way on purpose.
// The field list is lib/profile.ts's `Profile` type. "Organisers can read the roster and
// nobody else can" is the `allow list: if isAdmin()` line in firestore.rules, which
// scripts/rules-emulator.mjs executes against forged tokens on every run. If any of that
// changes, this page is wrong and has to change with it — so it names the files rather
// than paraphrasing them, which is the only way a reader can hold us to it.
//
// It deliberately promises nothing about retention windows, backups or deletion SLAs.
// The club is a handful of students with a Firebase project; a policy claiming a 30-day
// deletion pipeline would be a lie, and a lie in a privacy policy is worse than a gap.
// What it says instead is who to email and that a person does it by hand.
//
// NOT IN THE NAV, and not in PAGES. It is a reference document reached from the place it
// matters — the moment somebody is deciding whether to hand over their identity.

export const metadata: Metadata = {
  title: "Your data",
  description:
    "What the Scaler Open Source Club stores when you sign up, who can read it, and how to have it deleted.",
};

/** One section, with the id its link in the sign-in card points at. */
function Part({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt clears the floating nav — without it an anchor lands with the heading
    // tucked under the glass plate, which reads as the link having gone to the wrong
    // place. The value matches .page-top's derivation in globals.css.
    <section id={id} className="scroll-mt-28 border-t border-seam pt-8">
      <p className="label">{n}</p>
      <h2 className="mt-3 font-display text-display-md font-bold tracking-tight">
        {title}
      </h2>
      <div className="measure mt-5 space-y-4 text-body text-haze">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <main id="main">
      <section className="section page-top pb-16">
        <div className="measure">
          <p className="label">Sign-up</p>
          <h1 className="mt-4 font-display text-display-lg font-bold tracking-tight">
            Your data.
          </h1>
          <p className="mt-5 text-body-lg text-haze">
            What we store when you sign up, who can read it, and how to have it deleted.
            Short, because there is not much of it.
          </p>
        </div>

        <div className="mt-10 space-y-12">
          <Part id="what-we-store" n="01" title="What we store">
            <p>
              Signing in tells us three things, and Google is the one that tells us: the
              email address on your college account, the name on it, and an account id.
              The sign-in happens on Google&apos;s own page, so{" "}
              <strong className="text-ink">we never see your password</strong> — there is
              no password on this site to see.
            </p>
            <p>
              The form you fill in afterwards is kept as one record per member. It holds
              your name, your college address, your year and branch, your hostel, how much
              open source you have done, how you want to start, which programmes interest
              you, and your GitHub username if you gave one. Two timestamps record when
              you signed up and when you last changed something.
            </p>
            <p>
              That is the entire list — it is the <code>Profile</code> type in{" "}
              <code>web/lib/profile.ts</code>, and this site is open source, so you can
              check rather than take our word for it. There is no analytics account, no
              advertising identifier, no third-party tracker, and no data sold or shared
              with anybody outside the club.
            </p>
          </Part>

          <Part id="who-can-read-it" n="02" title="Who can read it">
            <p>
              You can, and you can change it whenever you like from the{" "}
              <Link href="/join" className="link-u text-accent">
                join page
              </Link>
              .
            </p>
            <p>
              Organisers can read the full list. That is the only reason the list exists:
              putting build-day pairs together, and working out who to tell about which
              programme.
            </p>
            <p>
              Nobody else can — and that is enforced by the database rather than by hiding
              a page. The rules in <code>firestore.rules</code> allow a member to read
              exactly their own record, allow the roster only to an address on the
              organisers&apos; list, and refuse everything else. A student who signs in
              with a personal Gmail is refused by those rules even if they reach the
              dashboard&apos;s URL. We test that on every change by running the rules
              against forged sign-ins for a member, another member, an organiser, a signed
              out visitor and an off-domain account.
            </p>
          </Part>

          <Part id="terms" n="03" title="Terms, such as they are">
            <p>
              Signing up is free, and it stays free. There is no fee, no paid tier, and
              nothing that becomes chargeable later.
            </p>
            <p>
              Signing up puts you on the club&apos;s list. It is not a place in{" "}
              <Link href="/programmes" className="link-u text-accent">
                any programme
              </Link>{" "}
              — Google Summer of Code, LFX Mentorship and the rest select their own people
              and the club has no say in it. Anyone who tells you otherwise is wrong.
            </p>
            <p>
              Sessions are open to any student at the university, and there is no
              selection at the door. We can ask somebody to leave for behaviour towards
              other members; that is the only membership condition there is.
            </p>
            <p>
              Programme and organisation names on this site are trademarks of their
              respective owners. Listing a programme is a statement of fact about our
              members, not an endorsement by that programme or company.
            </p>
          </Part>

          <Part id="data-deletion" n="04" title="Deleting your data">
            <p>
              Email{" "}
              {/* break-all, because the address is 35 characters with no break
                  opportunity in it — at 390px it measured 382px wide and pushed the
                  document to a 398px scrollWidth, which is a horizontally scrolling
                  page caused by one email address. */}
              <a href={`mailto:${LINKS.email}`} className="link-u break-all text-accent">
                {LINKS.email}
              </a>{" "}
              from your college address and ask us to delete your record. We delete the
              whole document, not a flag on it.
            </p>
            <p>
              An organiser does this by hand, so give it a few days. We are a handful of
              students with a database, not a service desk, and we would rather say that
              than print a deletion window we cannot keep.
            </p>
            <p>
              Your Google account is not ours to touch. To take away this site&apos;s
              access to it, remove it under{" "}
              <a
                href="https://myaccount.google.com/connections"
                target="_blank"
                rel="noreferrer"
                className="link-u text-accent"
              >
                your Google account&apos;s connections
              </a>
              . Deleting your record here does not sign you out of Google, and signing out
              of Google does not delete your record — they are two separate things and it
              is worth doing both.
            </p>
          </Part>
        </div>

        <p className="mt-10 border-t border-seam pt-6 text-sm leading-relaxed text-dust">
          Something here wrong, or out of date against the code? This site is one of the
          club&apos;s own repositories —{" "}
          <a href={LINKS.repo} target="_blank" rel="noreferrer" className="link-u text-accent">
            open an issue
          </a>{" "}
          or send a pull request. Sign-up is restricted to @{DOMAIN} addresses; this page
          is not.
        </p>
      </section>
    </main>
  );
}
