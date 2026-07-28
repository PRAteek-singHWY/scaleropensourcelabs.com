"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import type { MenteeSnapshot } from "@/lib/github";
import MenteeCard from "@/components/MenteeCard";
import ProgramOverview from "@/components/ProgramOverview";
import {
  fetchStore,
  createMentor,
  deleteMentor,
  createMentee,
  deleteMentee,
  type Store,
  type Mentor,
} from "@/lib/storage";

export default function Dashboard() {
  const { data: session } = useSession();
  const [store, setStore] = useState<Store>({ mentors: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snaps, setSnaps] = useState<Record<string, MenteeSnapshot>>({});

  const handleData = useCallback((id: string, snap: MenteeSnapshot) => {
    setSnaps((prev) => ({ ...prev, [id]: snap }));
  }, []);

  // Add-mentor form
  const [mName, setMName] = useState("");
  const [mGithub, setMGithub] = useState("");

  // Add-mentee form
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eGithub, setEGithub] = useState("");

  // Load from the database on mount.
  useEffect(() => {
    let alive = true;
    fetchStore()
      .then((s) => {
        if (!alive) return;
        setStore(s);
        setSelectedId((prev) => prev ?? s.mentors[0]?.id ?? null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load data"),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => store.mentors.find((m) => m.id === selectedId) ?? null,
    [store, selectedId],
  );

  const totalMentees = useMemo(
    () => store.mentors.reduce((n, m) => n + m.mentees.length, 0),
    [store],
  );

  async function onAddMentor(e: React.FormEvent) {
    e.preventDefault();
    const name = mName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const mentor = await createMentor({ name, github: mGithub.trim() || undefined });
      setStore((s) => ({ mentors: [...s.mentors, mentor] }));
      setSelectedId(mentor.id);
      setMName("");
      setMGithub("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add mentor");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveMentor(mentor: Mentor) {
    if (busy) return;
    if (!confirm(`Remove mentor "${mentor.name}" and their ${mentor.mentees.length} mentee(s)?`))
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteMentor(mentor.id);
      const remaining = store.mentors.filter((x) => x.id !== mentor.id);
      setStore({ mentors: remaining });
      if (selectedId === mentor.id) setSelectedId(remaining[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove mentor");
    } finally {
      setBusy(false);
    }
  }

  async function onAddMentee(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    const name = eName.trim();
    const email = eEmail.trim();
    const github = eGithub.trim();
    if (!name || !email || !github) return;
    setBusy(true);
    setError(null);
    try {
      const mentee = await createMentee({ mentorId: selected.id, name, email, github });
      setStore((s) => ({
        mentors: s.mentors.map((m) =>
          m.id === selected.id ? { ...m, mentees: [...m.mentees, mentee] } : m,
        ),
      }));
      setEName("");
      setEEmail("");
      setEGithub("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add mentee");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveMentee(mentorId: string, menteeId: string) {
    setError(null);
    try {
      await deleteMentee(menteeId);
      setStore((s) => ({
        mentors: s.mentors.map((m) =>
          m.id === mentorId
            ? { ...m, mentees: m.mentees.filter((x) => x.id !== menteeId) }
            : m,
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove mentee");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-edge bg-ink/70 px-3 py-2 text-sm text-slate-100 placeholder:text-muted/70 outline-none transition focus:border-pink/60 focus:ring-2 focus:ring-pink/20";

  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-edge bg-ink/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-blue text-sm font-black text-white shadow-glow">
            M
          </div>
          <div className="leading-tight">
            <div className="bg-pink-blue bg-clip-text text-sm font-extrabold text-transparent">
              Mentor Tracker
            </div>
            <div className="text-[10px] text-muted">
              Lead dashboard · public GitHub
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2 rounded-full border border-edge bg-panel/60 py-1 pl-1 pr-3 sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.image ?? `https://github.com/${user.login}.png`}
                alt={user.login ?? "you"}
                className="h-7 w-7 rounded-full ring-1 ring-edge"
              />
              <div className="leading-tight">
                <div className="text-xs font-medium text-slate-100">
                  {user.name ?? user.login}
                </div>
                <div className="text-[10px] text-muted">@{user.login}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-edge bg-panel/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-pink/50 hover:text-pink"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Global error banner */}
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-edge bg-panel/50 backdrop-blur">
          <form onSubmit={onAddMentor} className="space-y-2 border-b border-edge p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Add mentor
            </div>
            <input
              className={inputCls}
              placeholder="Mentor name"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="GitHub handle (optional)"
              value={mGithub}
              onChange={(e) => setMGithub(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-pink-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:opacity-80 disabled:opacity-60"
            >
              + Add mentor
            </button>
          </form>

          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="px-2 py-4 text-sm text-muted">Loading…</p>
            ) : store.mentors.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted">No mentors yet.</p>
            ) : (
              <ul className="space-y-1">
                {store.mentors.map((m) => {
                  const active = m.id === selectedId;
                  return (
                    <li key={m.id}>
                      <div
                        className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
                          active
                            ? "border-pink/50 bg-pink/10"
                            : "border-transparent hover:border-edge hover:bg-ink/50"
                        }`}
                        onClick={() => setSelectedId(m.id)}
                      >
                        <div
                          className={`h-6 w-1 rounded-full ${active ? "bg-pink-blue" : "bg-edge"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-100">
                            {m.name}
                          </div>
                          <div className="text-xs text-muted">
                            {m.mentees.length} mentee
                            {m.mentees.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveMentor(m);
                          }}
                          aria-label="Delete mentor"
                          className="rounded-md px-1.5 py-0.5 text-muted opacity-0 transition hover:bg-edge hover:text-pink group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-edge p-4 text-[11px] leading-relaxed text-muted">
            Data is stored securely in your Postgres database — never in the
            browser.
          </div>
        </aside>

        {/* Main pane */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="bg-pink-blue bg-clip-text text-3xl font-extrabold text-transparent">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
              </div>
              <p className="mt-3 max-w-md text-sm text-muted">
                Add a mentor in the sidebar, then add mentees under them by GitHub
                username. You&apos;ll get a live view of each mentee&apos;s public
                activity — issues, PRs, commits, streaks, and active repos.
              </p>
            </div>
          ) : (
            <div className="p-6 lg:p-8">
              {/* Header + summary tiles */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">
                    {selected.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                    {selected.github && (
                      <a
                        href={`https://github.com/${selected.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink hover:text-sky"
                      >
                        @{selected.github}
                      </a>
                    )}
                    <span>
                      {selected.mentees.length} mentee
                      {selected.mentees.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <StatTile label="Mentors" value={store.mentors.length} />
                  <StatTile label="This mentor" value={selected.mentees.length} />
                  <StatTile label="All mentees" value={totalMentees} />
                </div>
              </div>

              {/* Add mentee */}
              <form
                onSubmit={onAddMentee}
                className="mt-6 grid grid-cols-1 gap-2 rounded-2xl border border-edge bg-panel/40 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <input
                  className={inputCls}
                  placeholder="Name"
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                />
                <input
                  className={inputCls}
                  type="email"
                  placeholder="Email"
                  value={eEmail}
                  onChange={(e) => setEEmail(e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="GitHub username"
                  value={eGithub}
                  onChange={(e) => setEGithub(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-pink-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:opacity-80 disabled:opacity-60"
                >
                  + Add mentee
                </button>
              </form>

              {/* Program overview (aggregates loaded mentee snapshots) */}
              {selected.mentees.length > 0 && (
                <div className="mt-6">
                  <ProgramOverview
                    totalMentees={selected.mentees.length}
                    data={selected.mentees
                      .map((m) => ({ name: m.name, snap: snaps[m.id] }))
                      .filter(
                        (d): d is { name: string; snap: MenteeSnapshot } =>
                          !!d.snap && !d.snap.error,
                      )}
                  />
                </div>
              )}

              {/* Grid */}
              {selected.mentees.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted">
                  No mentees yet. Add one above to see their GitHub activity.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {selected.mentees.map((mentee) => (
                    <MenteeCard
                      key={mentee.id}
                      mentee={mentee}
                      onRemove={() => onRemoveMentee(selected.id, mentee.id)}
                      onData={handleData}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[84px] rounded-xl border border-edge bg-panel/60 px-4 py-2 text-center">
      <div className="bg-pink-blue bg-clip-text text-xl font-extrabold text-transparent">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
    </div>
  );
}
