"use client";

// "Organisers only", in one place.
//
// The organisers' area was one route with six panels on it, each carrying its own copy of
// this check and its own wording for the refusal. It is seven routes now, so the copy
// would have been seven copies — and the one that drifts is the one that tells somebody
// they are not an organiser in a slightly different voice from the last page they tried.
//
// IT IS NOT A PRIVILEGE BOUNDARY, and nothing about it should be mistaken for one. Every
// admin route is static HTML on a CDN and anybody can fetch it. What refuses them is the
// `list` rule on users/, the admin-only writes on every collection these pages touch, and
// the `admins` membership check the rules do on each request — none of which a client can
// talk its way past. This decides what to PAINT. If you ever move the membership test out
// of firestore.rules and into this file, you have removed the security.
//
// THREE STATES, and the middle one matters. `isAdmin === undefined` means the check is
// still in flight — showing the refusal during it tells every organiser they are not one,
// for as long as the read takes, on every load.

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export default function AdminGate({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();

  if (user === undefined || (isAdmin === undefined && user)) {
    return (
      <div className="card rounded-panel bg-raise p-8" aria-busy="true">
        {/* A page can be LOADED IN this state rather than flickering through it, so it
            needs the document's name. The h1 the sections carry is not rendered yet. */}
        <h1 className="sr-only">Organisers</h1>
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">Checking your access…</p>
      </div>
    );
  }

  if (!user || isAdmin !== true) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <h1 className="sr-only">Organisers</h1>
        <p className="chip">Organisers only</p>
        <p className="mt-4 font-display text-display-md font-bold tracking-tight">
          This page is not for you — yet.
        </p>
        <p className="measure mt-4 text-body text-haze">
          {user
            ? "You are signed in, but your address is not on the organisers list. If it should be, ask somebody who already has access to add you."
            : "Sign in with your college account first. If you are an organiser, this page will fill in."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
