import Shell from "@/components/dashboard/Shell";

// The SIGNED-IN area: /onboarding, /dashboard, /admin.
//
// It carries none of the public site's chrome — no six-link nav arguing for the club, no
// sitemap footer. Every reader here has already joined. What it has instead is the app
// shell: a flush top bar with the view switch, a sidebar, and a three-link footer.
//
// THE SHELL IS HERE RATHER THAN INSIDE EACH PAGE, which is the point of the route group
// and the reason it replaced the pathname check that did this job before. A page in this
// folder cannot forget the shell, and a page outside it cannot accidentally get one.
//
// THIS IS NOT A PRIVILEGE BOUNDARY. A layout decides what to paint, not who may read.
// Every one of these routes is static HTML on a CDN and anybody can fetch it; what
// refuses to hand over data is firestore.rules. See the note at the top of lib/auth.tsx
// before concluding that an app shell makes anything safe.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
