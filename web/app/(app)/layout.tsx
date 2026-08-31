import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";

// The SIGNED-IN area: /onboarding, /dashboard, /admin.
//
// It carries none of the public site's chrome — see the note in (site)/layout.tsx for
// what was removed and why. What it has instead is a header that says who you are signed
// in as and a footer that carries the three privacy anchors, which are the only part of
// the site footer a member actually needs from here.
//
// THIS IS NOT A PRIVILEGE BOUNDARY. A layout decides what to paint, not who may read.
// Every one of these routes is static HTML on a CDN and anybody can fetch it; what
// refuses to hand over data is firestore.rules. See the note at the top of lib/auth.tsx
// before concluding that an app shell makes anything safe.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
      <AppFooter />
    </>
  );
}
