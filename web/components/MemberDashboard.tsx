"use client";

// A member's own page. Where signing in leads.
//
// WHAT IT IS FOR. Before this existed, joining ended on a read-only summary card in the
// right-hand column of a marketing page: you filled in a form, it told you the details
// were saved, and there was nothing else. Every subsequent thing the club wanted a member
// to do — enrol in the GSoC cohort, correct a detail, find the organisers' dashboard —
// had nowhere to live. This is that somewhere.
//
// WHY IT IS NOT A `<dl>` ANY MORE. It was: four label/value rows in a bordered list, which
// is the correct markup for a definition list and the wrong object for this screen. A
// table of your own answers read back to you is a form's confirmation step, and it made a
// page somebody lands on every week feel like the receipt for one they filled in once. The
// same four facts are tiles now — same information, same reading order, but the page reads
// as a place rather than as a submission.
//
// IT DECIDES WHO NEEDS ONBOARDING, and it is the only page that does. /join sends every
// signed-in reader here without reading their profile, so there is exactly one place that
// answers "has this member finished joining" rather than two that can disagree. A reader
// without a complete profile is sent on to /onboarding, carrying any ?path= with them.
//
// NOT A PRIVILEGE GATE — see the note at the top of MemberOnly.tsx. This HTML is on the
// CDN and anybody can fetch it. firestore.rules is what refuses to hand over data.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "firebase/auth";
import MemberOnly, { GateCard } from "@/components/MemberOnly";
import MentorPicker from "@/components/MentorPicker";
import { useAuth } from "@/lib/auth";
import { batchFromEmail } from "@/lib/batch";
import { fmtDate, isComplete, readProfile, toDate, type Profile } from "@/lib/profile";
import { HOSTELS, PATHS } from "@/content/join";

/** One fact, as an object rather than a table row.
 *
 *  `mono` is for the values that are identifiers — a GitHub handle, a batch code. Names
 *  and places are not identifiers and reading them in a monospace face makes a person's
 *  hostel look like a database key. */
function Tile({
  label,
  value,
  mono = false,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const body = (
    <span
      className={[
        "mt-2 block break-words text-body-lg font-semibold",
        mono ? "font-mono text-[15px]" : "",
        // A value nobody gave is stated in the quiet colour rather than left blank: an
        // empty tile reads as broken, "not given" reads as a fact.
        value === "—" || value === "not given" || value === "not recorded"
          ? "font-normal text-dust"
          : "text-ink",
      ].join(" ")}
    >
      {value}
    </span>
  );

  return (
    <div className="card rounded-panel bg-raise p-5 transition-colors">
      <span className="label">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block underline decoration-seam underline-offset-4 transition-colors hover:decoration-accent"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}

function Body({ user }: { user: User }) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");

  const path = params.get("path");

  const load = useCallback(async (uid: string) => {
    setLoadError("");
    try {
      setProfile(await readProfile(uid));
    } catch (e) {
      console.error("[osc] could not read profile", e);
      setProfile(null);
      setLoadError("We could not load your profile. Reload the page, or email us.");
    }
  }, []);

  useEffect(() => {
    void load(user.uid);
  }, [user, load]);

  // Not finished joining — go and finish. `replace` rather than `push`: a member bounced
  // through here has no reason to be able to go "back" to a page that will bounce them
  // again. The ?path= rides along, because this may be the first hop after sign-in.
  //
  // The load error is checked too: a profile we FAILED to read is not a profile that does
  // not exist, and redirecting on a network blip would drop somebody into onboarding they
  // have already done.
  const needsOnboarding = profile !== undefined && !isComplete(profile) && !loadError;
  useEffect(() => {
    if (!needsOnboarding) return;
    router.replace(path ? `/onboarding?path=${encodeURIComponent(path)}` : "/onboarding");
  }, [needsOnboarding, path, router]);

  if (profile === undefined || needsOnboarding) {
    return (
      <GateCard busy>
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">
          {needsOnboarding ? "Just three questions first…" : "Loading your dashboard…"}
        </p>
      </GateCard>
    );
  }

  if (!profile) {
    return (
      <GateCard>
        <p className="chip">Something went wrong</p>
        <p className="mt-4 text-body text-ember" role="alert">
          {loadError || "We could not load your profile."}
        </p>
      </GateCard>
    );
  }

  const batch = batchFromEmail(profile.email);
  const joined = toDate(profile.created_at);
  const firstName = profile.name.trim().split(/\s+/)[0];

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------------- the band
          THE ONE THING ON THE PAGE THAT IS NOT IN A CARD. Everything used to be: the
          greeting, the address, the details and the mentorship all sat inside the same
          bordered white rectangle, so nothing had any rank and the page read as one long
          panel. Lifting the identity out onto the page gives the cards below something to
          be subordinate to, which is most of what makes a layout feel composed rather
          than stacked. */}
      <div>
        {/* NO SECOND BIG HEADING. The first draft opened with the member's first name at
            display size, which read well on its own and put two competing headlines on
            one screen — the route's h1 four inches above says "Your club." The name moved
            into this sentence instead, where it does the same work of making the page
            theirs without arguing with the heading. */}
        <p className="measure text-body-lg text-haze">
          You are on the list, <strong className="font-semibold text-ink">{firstName}</strong>.
          Somebody will message you before the next session — there is nothing to prepare,
          and nothing else to do here unless you want to enrol in a programme below.
        </p>

        {/* THE GATE PLATE, RETURNED, and reshaped. The same yellow object that carried
            the domain rule on the way in now carries the address it let through, which is
            what makes the two screens one flow rather than two forms. It is a full-width
            slab here rather than a boxed card, because on this page it is the header
            rather than a row in a table.
            "REGISTERED", not "MEMBER" — being on the list is what has happened; the club
            part happens on a Saturday, and the plate does not get to promise it either.
            The keyline without the offset shadow, for the reason set out in JoinGate.tsx:
            on this stylesheet the hard shadow marks a CONTROL, and this is a plate of
            text. */}
        <div className="mt-7 rounded-panel border-2 border-black bg-pop p-6 text-black sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <p className="font-mono text-label uppercase tracking-wider text-black/70">
                Registered
              </p>
              <p className="mt-1.5 break-all font-mono text-[1.125rem] font-bold leading-tight sm:text-[1.375rem]">
                {profile.email}
              </p>
            </div>
            {joined && (
              <p className="shrink-0 font-mono text-[0.8125rem] uppercase tracking-wider text-black/80">
                Member since {fmtDate(profile.created_at)}
              </p>
            )}
          </div>

          {/* On black-on-yellow, which is 14.9:1 — the highest-contrast pair in the
              palette, and the licence for spending the loudest colour on the site here. */}
          {batch && (
            <ul className="mt-5 flex flex-wrap gap-2 border-t border-black/20 pt-5">
              {[batch.label, batch.branch, batch.yearLabel, `Roll ${batch.roll}`].map((v) => (
                <li
                  key={v}
                  className="rounded-full border border-black/30 px-3 py-1 font-mono text-[13px] font-medium"
                >
                  {v}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ the four facts */}
      <section aria-labelledby="your-details">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          {/* h2, because the route's h1 is the page title and the QA sweep checks heading
              order. It is styled as a `.label` rather than as a display heading: this is
              a section marker on an app screen, not a headline. */}
          <h2 id="your-details" className="label">
            Your details
          </h2>
          <Link
            href="/onboarding?edit=1"
            className="tap font-mono text-label uppercase tracking-wider text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink"
          >
            Edit
          </Link>
        </div>
        {/* The address is on the plate above, so it is not repeated here — it was the one
            row of the old table a reader could already see twice on the screen. Nor are
            batch, branch or year: those are on the plate too, and they are read out of the
            address rather than stored, so listing them as "details" would imply they were
            something the member had told us. */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Name" value={profile.name} />
          <Tile
            label="Hostel"
            value={HOSTELS.find((h) => h.value === profile.hostel)?.label ?? profile.hostel}
          />
          <Tile
            label="GitHub"
            mono
            value={profile.github ?? "not given"}
            href={profile.github ? `https://github.com/${profile.github}` : undefined}
          />
          <Tile
            label="How you found us"
            value={
              profile.path
                ? PATHS.find((p) => p.id === profile.path)?.name ?? profile.path
                : "not recorded"
            }
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- the programmes */}
      <MentorPicker user={user} />

      {/* Only rendered for an admin, and it is a convenience rather than a gate — the
          dashboard refuses to load data for anybody else because the rules refuse the
          query, not because this link is hidden. It sits at the foot rather than beside
          "Edit" because it is the one link on this page that leads somewhere else
          entirely. */}
      {isAdmin && (
        <div className="border-t border-seam pt-8">
          <Link href="/admin" className="btn btn-secondary">
            Open the organisers&apos; dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MemberDashboard() {
  return (
    <MemberOnly loading="Loading your dashboard…">
      {(user) => <Body user={user} />}
    </MemberOnly>
  );
}
