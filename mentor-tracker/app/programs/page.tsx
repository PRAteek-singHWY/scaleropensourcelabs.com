import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";

export const metadata = {
  title: "Programs",
  description:
    "The three tracks Scaler Open Source Club members work in: mentorship, AI security, and club projects.",
};

const TRACKS = [
  {
    name: "Open source mentorship",
    summary:
      "The default track, and where most members start. A mentor helps you choose a project that actually needs help, find an issue sized for a first contribution, and review your patch before a maintainer sees it.",
    detail: [
      "You get paired with a mentor from the club who has landed work in a real project.",
      "You pick an issue together. Good first issues are usually documentation gaps, failing edge cases, or small refactors — not glamorous, but they get merged.",
      "Your mentor reviews the patch before you open the pull request, so the version a maintainer reads is already close.",
      "The point is the second contribution, not the first. Once you know a codebase, the next issue is much faster.",
    ],
  },
  {
    name: "AI security",
    summary:
      "Find security weaknesses in open-source AI tooling and land the fix upstream. Higher difficulty, and the work most likely to get you noticed.",
    detail: [
      "Focus areas: leaked credentials in model configs, unsafe checkpoint deserialisation, prompt injection reaching real tools, insecure server defaults, dependency hygiene.",
      "Everything goes through coordinated disclosure — private report to the maintainers first, patch attached, publish only after they ship.",
      "Strict rules on scope: your own environments only, never somebody else's running service, never real user data.",
    ],
    href: "/security",
    cta: "Read the disclosure policy",
  },
  {
    name: "Club projects",
    summary:
      "Software the club owns and runs. This website is one of them — the leaderboard you are looking at is built from the GitHub API, and the issue tracker is open.",
    detail: [
      "Working on a club project is the lowest-friction way to get your first merged PR, because the maintainers are people you can talk to in person.",
      "It is also where the club's own infrastructure gets better: the contribution refresh job, accessibility fixes, and the admin tooling all need work.",
    ],
  },
] as const;

export default function ProgramsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 pt-14">
        <p className="eyebrow">Three tracks</p>
        <h1 className="display-lg mt-3">Programs</h1>
        <p className="mt-4 text-sm leading-relaxed text-site-dim">
          Every track ends the same way: a pull request somebody else merged. They
          differ in difficulty and in what you learn getting there.
        </p>

        <div className="mt-12 space-y-14">
          {TRACKS.map((t) => (
            <section key={t.name}>
              <h2 className="font-display text-xl font-bold tracking-tightest text-site-ink">
                {t.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-site-dim">
                {t.summary}
              </p>
              <ul className="mt-5 space-y-3 border-l border-site-line pl-5">
                {t.detail.map((d, i) => (
                  <li key={i} className="text-sm leading-relaxed text-site-dim">
                    {d}
                  </li>
                ))}
              </ul>
              {"href" in t && t.href && (
                <Link
                  href={t.href}
                  className="mt-5 inline-block font-mono text-xs text-site-violet hover:brightness-125"
                >
                  {t.cta} →
                </Link>
              )}
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-site-line pt-8">
          <Link
            href="/join"
            className="rounded-lg bg-site-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Join the club
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
