"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

type MemberRecord = {
  id: string;
  github: string;
  displayName: string;
  batch: string | null;
  bio: string | null;
  publicConsent: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

const field =
  "w-full rounded-lg border border-site-line bg-site-bg px-3.5 py-2.5 text-sm text-site-ink placeholder:text-site-faint outline-none transition focus:border-site-violet";

export default function JoinForm() {
  const { data: session, status } = useSession();
  const [existing, setExisting] = useState<MemberRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [batch, setBatch] = useState("");
  const [bio, setBio] = useState("");
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Prefill from an existing record so this doubles as "edit my listing".
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/members", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { member: MemberRecord | null }) => {
        if (d.member) {
          setExisting(d.member);
          setDisplayName(d.member.displayName);
          setBatch(d.member.batch ?? "");
          setBio(d.member.bio ?? "");
          setConsent(d.member.publicConsent);
        } else {
          setDisplayName(session?.user?.name ?? "");
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [status, session?.user?.name]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          batch: batch || undefined,
          bio: bio || undefined,
          publicConsent: consent,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { member?: MemberRecord; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
      if (data?.member) {
        setExisting((prev) =>
          prev
            ? { ...prev, publicConsent: consent, displayName }
            : ({
                ...data.member,
                displayName,
                batch: batch || null,
                bio: bio || null,
              } as MemberRecord),
        );
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return <div className="h-40 animate-pulse rounded-2xl bg-site-raise" />;
  }

  // Not signed in. Explain WHY a sign-in is required rather than just demanding it.
  if (status !== "authenticated") {
    return (
      <div className="rounded-2xl border border-site-line bg-site-raise p-7">
        <h2 className="font-display text-lg font-bold tracking-tightest text-site-ink">
          Sign in with GitHub to continue
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-site-dim">
          Your listing shows your GitHub contribution record, so we ask GitHub to
          confirm the account is yours. It means nobody can add you to this site
          without your say — and nobody can claim your work.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-site-dim">
          We request no permissions and read only public data.
        </p>
        <button
          onClick={() => void signIn("github", { callbackUrl: "/join" })}
          className="mt-6 rounded-lg bg-site-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Continue with GitHub
        </button>
      </div>
    );
  }

  const login = session?.user?.login;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-site-line bg-site-raise p-7"
    >
      <div className="flex items-center gap-3 border-b border-site-line pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={session?.user?.image ?? `https://github.com/${login}.png`}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-full ring-1 ring-site-line"
        />
        <div>
          <div className="text-sm font-semibold text-site-ink">
            Signed in as @{login}
          </div>
          <div className="font-mono text-[11px] text-site-faint">
            Your listing will use this account
          </div>
        </div>
      </div>

      {existing && loaded && (
        <div
          className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
            existing.status === "APPROVED"
              ? "border-site-violet/30 bg-site-violet/10 text-site-ink"
              : "border-site-amber/30 bg-site-amber/10 text-site-amber"
          }`}
        >
          {existing.status === "APPROVED" && existing.publicConsent && (
            <>
              You&apos;re listed publicly.{" "}
              <Link href={`/members/${existing.github}`} className="underline">
                View your page
              </Link>
              .
            </>
          )}
          {existing.status === "APPROVED" && !existing.publicConsent && (
            <>
              You&apos;re a member, but hidden from the public site because the
              listing permission below is off.
            </>
          )}
          {existing.status === "PENDING" && (
            <>Your membership is waiting for an organiser to review it.</>
          )}
          {existing.status === "REJECTED" && (
            <>
              This membership wasn&apos;t approved. Talk to a club organiser if you
              think that&apos;s a mistake.
            </>
          )}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="displayName"
            className="eyebrow mb-2 block"
          >
            Name to show
          </label>
          <input
            id="displayName"
            className={field}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you want to be listed"
            required
            maxLength={80}
          />
        </div>

        <div>
          <label htmlFor="batch" className="eyebrow mb-2 block">
            Graduating year <span className="normal-case">(optional)</span>
          </label>
          <input
            id="batch"
            className={field}
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="2027"
            maxLength={16}
          />
        </div>

        <div>
          <label htmlFor="bio" className="eyebrow mb-2 block">
            One line about what you work on <span className="normal-case">(optional)</span>
          </label>
          <textarea
            id="bio"
            className={`${field} min-h-[76px] resize-y`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Backend and infrastructure. Currently poking at Kubernetes operators."
            maxLength={280}
          />
          <div className="mt-1.5 text-right font-mono text-[11px] text-site-faint">
            {bio.length}/280
          </div>
        </div>

        {/* Consent. Unticked by default, and spells out exactly what gets published. */}
        <fieldset className="rounded-xl border border-site-line bg-site-bg p-4">
          <legend className="eyebrow px-1">Public listing</legend>
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#7C5CFF]"
            />
            <span className="text-sm leading-relaxed text-site-dim">
              List me on the public leaderboard. This publishes the name above, my
              GitHub username, avatar, and public contribution statistics — repos I
              contribute to, pull request and issue counts, and my contributor rank.{" "}
              <strong className="font-semibold text-site-ink">
                It never publishes my email address.
              </strong>
            </span>
          </label>
          <p className="mt-3 border-t border-site-line pt-3 text-[13px] leading-relaxed text-site-faint">
            You can untick this at any time and your page comes down. Everything
            published is already public on GitHub — this only collects it in one
            place.
          </p>
        </fieldset>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="mt-5 rounded-lg border border-site-violet/30 bg-site-violet/10 px-4 py-3 text-sm text-site-ink">
          Saved. {consent ? "You'll appear once an organiser approves you." : "You're not listed publicly."}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-site-violet px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Saving…" : existing ? "Update my listing" : "Join the club"}
      </button>
    </form>
  );
}
