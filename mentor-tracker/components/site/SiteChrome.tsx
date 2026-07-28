import Link from "next/link";

// Shared nav + footer for the public site. Server components — nothing here needs
// interactivity, so nothing here ships JavaScript.

const NAV = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/programs", label: "Programs" },
  { href: "/join", label: "Join" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-site-line/70 bg-site-bg/85 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5"
      >
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="font-display text-base font-extrabold tracking-tightest text-site-ink">
            OSC
          </span>
          <span className="hidden font-mono text-[11px] text-site-faint transition group-hover:text-site-dim sm:inline">
            scaleropensourcelabs.com
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 font-mono text-xs text-site-dim transition hover:bg-site-raise hover:text-site-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-site-line/70">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <div className="font-display text-sm font-bold tracking-tightest text-site-ink">
              Scaler Open Source Club
            </div>
            <p className="mt-2 text-sm leading-relaxed text-site-dim">
              A student club at Scaler School of Technology. Members contribute to
              open-source projects that other people depend on.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <div className="eyebrow mb-2.5">Site</div>
              <ul className="space-y-1.5 text-sm">
                {NAV.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="text-site-dim hover:text-site-ink">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-2.5">Open source</div>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <Link href="/security" className="text-site-dim hover:text-site-ink">
                    Report a vulnerability
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    className="text-site-dim hover:text-site-ink"
                  >
                    This site&apos;s source
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-site-line/70 pt-5">
          <p className="font-mono text-[11px] text-site-faint">
            Contribution data from the public GitHub API. Members appear only with
            their consent.
          </p>
          <Link
            href="/admin"
            className="font-mono text-[11px] text-site-faint hover:text-site-dim"
          >
            Organiser sign-in
          </Link>
        </div>
      </div>
    </footer>
  );
}
