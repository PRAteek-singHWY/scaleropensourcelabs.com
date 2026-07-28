// The dashboard keeps its own skin. Public pages use the site palette from
// globals.css; this wrapper restores the internal tool's darker surface and
// ambient gradient so moving the dashboard under /admin didn't restyle it.
export const metadata = {
  title: "Dashboard",
  // An internal tool has no business in search results.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-surface min-h-screen">{children}</div>;
}
