import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";
import JoinForm from "@/components/site/JoinForm";

export const metadata = {
  title: "Join",
  description:
    "Join the Scaler Open Source Club. Sign in with GitHub, choose whether to be listed publicly, and start contributing.",
};

export default function JoinPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-5 pt-14">
        <p className="eyebrow">Membership</p>
        <h1 className="display-lg mt-3">Join the club</h1>
        <p className="mt-4 text-sm leading-relaxed text-site-dim">
          Two steps: confirm your GitHub account, then decide whether your
          contribution record appears on the public leaderboard. Being listed is
          optional — you can be a member without it.
        </p>

        <div className="mt-9">
          <JoinForm />
        </div>

        <section className="mt-12 border-t border-site-line pt-8">
          <h2 className="font-display text-base font-bold tracking-tightest text-site-ink">
            What happens next
          </h2>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-site-dim">
            <li className="flex gap-3">
              <span className="font-mono text-xs text-site-violet">01</span>
              <span>
                An organiser reviews your membership. This is a real club at a real
                school, so the roster is checked rather than open.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs text-site-violet">02</span>
              <span>
                If you agreed to a public listing, we collect your public GitHub
                contribution record and your page goes live.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs text-site-violet">03</span>
              <span>
                You get paired with a mentor and pick a first issue. That part happens
                off this website.
              </span>
            </li>
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
