import SignInButton from "@/components/SignInButton";
import { isDemoMode } from "@/lib/demo";

export const metadata = { title: "Sign in · Mentor Tracker" };

// Server component: reads NextAuth's ?error=… so we can explain a blocked login.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const demo = isDemoMode();
  const denied =
    searchParams?.error === "AccessDenied" ||
    searchParams?.error === "Callback";
  const otherError = searchParams?.error && !denied;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* ambient glow orbs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-pink/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue/20 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-edge bg-panel/80 p-8 backdrop-blur-xl shadow-glow">
          {/* logo mark */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-blue text-lg font-black text-white shadow-glow">
              M
            </div>
            <div>
              <div className="bg-pink-blue bg-clip-text text-lg font-extrabold text-transparent">
                Mentor Tracker
              </div>
              <div className="text-xs text-muted">Lead dashboard</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-100">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            This dashboard is private. Only allowlisted accounts can enter — your
            GitHub login is checked server-side against{" "}
            <code className="rounded bg-ink/70 px-1 py-0.5 text-[11px] text-slate-300">
              ALLOWED_LOGINS
            </code>
            .
          </p>

          {denied && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <strong className="font-semibold">Access denied.</strong> That
              GitHub account isn&apos;t on the allowlist for this dashboard.
            </div>
          )}
          {otherError && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Sign-in error: {searchParams.error}. Check the OAuth app config.
            </div>
          )}

          <div className="mt-6">
            <SignInButton
              demo={demo}
              callbackUrl={searchParams?.callbackUrl ?? "/admin"}
            />
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
            We request no scopes and never see your password. GitHub returns only
            your public profile. Your data list stays in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
