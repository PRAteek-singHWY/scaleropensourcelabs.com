import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";

export const metadata = {
  title: "Security",
  description:
    "How to report a vulnerability in this website, and how the club handles security work in open-source AI projects.",
};

const SECURITY_EMAIL =
  process.env.NEXT_PUBLIC_SECURITY_EMAIL ?? "security@scaleropensourcelabs.com";

export default function SecurityPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 pt-14">
        <p className="eyebrow">Coordinated disclosure</p>
        <h1 className="display-lg mt-3">Security</h1>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold tracking-tightest text-site-ink">
            Found something in this website?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-site-dim">
            Email{" "}
            <a
              href={`mailto:${SECURITY_EMAIL}`}
              className="text-site-violet hover:brightness-125"
            >
              {SECURITY_EMAIL}
            </a>{" "}
            with what you found and how to reproduce it. Please don&apos;t open a
            public issue first — give us a chance to fix it before it&apos;s
            common knowledge.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-site-dim">
            <li>We&apos;ll acknowledge your report within three days.</li>
            <li>
              We&apos;ll tell you what we found, whether we&apos;re fixing it, and
              when.
            </li>
            <li>
              We&apos;ll credit you when we publish the fix, unless you&apos;d rather
              we didn&apos;t.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-site-dim">
            Test against your own account and your own data. Don&apos;t access other
            members&apos; records, don&apos;t run denial-of-service or automated
            scanners against the live site, and don&apos;t use a finding to reach
            anything beyond proving it exists. Report it in good faith and we&apos;ll
            treat it that way.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-lg font-bold tracking-tightest text-site-ink">
            The AI security track
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-site-dim">
            A lot of open-source AI tooling shipped fast and is now load-bearing.
            That combination leaves real, findable weaknesses, and fixing them is
            some of the highest-value work a student contributor can do — the
            maintainers are usually glad of the help, and the patch is public
            evidence you can point at.
          </p>

          <h3 className="mt-8 font-display text-base font-bold tracking-tightest text-site-ink">
            What members work on
          </h3>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-site-dim">
            <li className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-site-violet" />
              <span>
                <strong className="font-semibold text-site-ink">
                  Credential and secret leakage.
                </strong>{" "}
                API keys committed into model configs, notebooks, and example code;
                tokens logged in plaintext by inference servers.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-site-violet" />
              <span>
                <strong className="font-semibold text-site-ink">
                  Unsafe deserialisation.
                </strong>{" "}
                Model checkpoints loaded through pickle and similar formats that
                execute code on load. Migrating a project to a safe loader is a
                well-scoped, genuinely useful first contribution.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-site-violet" />
              <span>
                <strong className="font-semibold text-site-ink">
                  Prompt injection and tool-use boundaries.
                </strong>{" "}
                Agent frameworks that let untrusted input reach a shell, a
                filesystem, or an outbound request without a confirmation step.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-site-violet" />
              <span>
                <strong className="font-semibold text-site-ink">
                  Insecure defaults.
                </strong>{" "}
                Inference servers that bind to every interface with no auth, debug
                endpoints enabled in production images, permissive CORS.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-site-violet" />
              <span>
                <strong className="font-semibold text-site-ink">
                  Dependency and supply-chain hygiene.
                </strong>{" "}
                Pinning, lockfile integrity, and replacing abandoned transitive
                dependencies.
              </span>
            </li>
          </ul>

          <h3 className="mt-8 font-display text-base font-bold tracking-tightest text-site-ink">
            How we handle findings
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-site-dim">
            Everything goes through the affected project&apos;s own disclosure
            process. In order:
          </p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-site-dim">
            {[
              "Confirm it, in a local environment you control. Never against somebody else's deployment.",
              "Report it privately to the maintainers — a GitHub security advisory, or the address in their SECURITY.md.",
              "Offer a patch. A report with a working fix attached is what gets merged.",
              "Wait for the maintainers. They decide the timeline and when it goes public, not us.",
              "Write it up once it's fixed and public. That's the part that becomes your portfolio.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-xs text-site-violet">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-xl border border-site-amber/25 bg-site-amber/[0.07] p-5">
            <h3 className="font-display text-sm font-bold tracking-tightest text-site-amber">
              The rules that aren&apos;t negotiable
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-site-dim">
              <li>
                Only test systems you own or have written permission to test. A
                public GitHub repository is not permission to attack a company&apos;s
                running service.
              </li>
              <li>
                No exploit code published before the maintainers have shipped a fix
                and agreed to disclosure.
              </li>
              <li>
                Never touch real user data. If a finding would expose someone,
                stop and report it immediately.
              </li>
              <li>
                If a maintainer asks you to stop, stop. Bring it to an organiser
                rather than escalating on your own.
              </li>
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-site-faint">
              Members who ignore these are removed from the track. This work depends
              entirely on maintainers trusting that a message from this club is
              worth reading.
            </p>
          </div>
        </section>

        <div className="mt-14 border-t border-site-line pt-8">
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
