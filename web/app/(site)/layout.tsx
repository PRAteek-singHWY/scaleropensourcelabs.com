import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import Footer from "@/components/Footer";

// The PUBLIC site's chrome: the nav strip, the scroll reveals, and the four-column
// footer. Everything here is addressed to somebody deciding whether to join.
//
// IT USED TO BE IN THE ROOT LAYOUT, which meant it also wrapped /dashboard, /onboarding
// and /admin — so a member who had joined last month still got a bar arguing the case for
// joining, ending in a filled button pointing at the page they were already on. Splitting
// it out is what makes "the marketing chrome" a thing a route opts into rather than a
// thing every route inherits.
//
// A ROUTE GROUP RATHER THAN A CLIENT-SIDE PATHNAME CHECK. `(site)` does not appear in any
// URL, so nothing about the routes changed — but the decision is made at build time, per
// route, in the static export. The alternative was a client component reading
// usePathname() and returning null, which ships the marketing nav's markup to every app
// page and then removes it after hydration: a visible flash of somebody else's chrome, on
// the one surface that should feel like it was built for the person signed into it.
//
// Reveal renders nothing; it opts the document in to the scroll settle. It lives here
// rather than at the root because an app surface should not animate its own furniture in
// as you scroll past it — and doing it once per group is also what stops each route
// re-registering its own observer on navigation.

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <Reveal />
      {children}
      <Footer />
    </>
  );
}
