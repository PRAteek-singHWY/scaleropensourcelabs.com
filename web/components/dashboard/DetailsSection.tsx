"use client";

// "My details" — the record the club holds about a member, and the form to change it.
//
// IT WAS A PANEL IN THE DASHBOARD'S RIGHT COLUMN, and the sidebar's "My details" was an
// anchor to it (`/dashboard#details`) rather than a page. That is the kind of nav item a
// reader presses once, watches the page jump, and stops trusting — and it meant the form,
// when opened, expanded inside a column sized for a summary card.
//
// It is a route now, so editing gets the width it needs and the sidebar link goes
// somewhere. The record is the default; the form is a state you enter deliberately.

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import RequireProfile from "@/components/dashboard/RequireProfile";
import SectionHead from "@/components/dashboard/SectionHead";
import ProfileCard from "@/components/ProfileCard";
import ProfileForm from "@/components/ProfileForm";

export default function DetailsSection() {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  return (
    <RequireProfile loading="Loading your details…">
      {({ user, profile, reload }) => (
        <div className="mx-auto max-w-3xl">
          <SectionHead
            eyebrow="Your record"
            title={editing ? "Update your details." : "Your details."}
            action={
              editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="tap font-mono text-label uppercase tracking-wider text-haze underline decoration-seam underline-offset-4 transition-colors hover:text-ink"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="btn btn-secondary btn-compact"
                >
                  Edit
                </button>
              )
            }
          >
            {editing
              ? "Change anything and save. Your address stays as it is on your college account — it is what your membership hangs on."
              : "This is everything the club holds about you, and it is visible to you and the organisers only. Nothing here is published on the site."}
          </SectionHead>

          {editing ? (
            // SUSPENSE IS REQUIRED, not tidiness: ProfileForm reads useSearchParams for the
            // ?path= preselect, and an unwrapped useSearchParams fails the static export
            // build outright — at build time, which is the good version of that error.
            <Suspense fallback={<div className="h-[42rem]" aria-hidden />}>
              <ProfileForm
                user={user}
                profile={profile}
                onSaved={() => {
                  setEditing(false);
                  // Re-read rather than trusting the local echo, so the card shows the
                  // server's timestamps rather than a client clock.
                  reload();
                }}
              />
            </Suspense>
          ) : (
            <>
              <ProfileCard profile={profile} tone="record" onEdit={() => setEditing(true)} />
              {/* THE WAY OUT OF THE SECTION, because a route with no exit but the sidebar
                  is a dead end on a phone, where the sidebar is not on screen. */}
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="tap mt-8 font-mono text-label uppercase tracking-wider text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink"
              >
                Back to your week
              </button>
            </>
          )}
        </div>
      )}
    </RequireProfile>
  );
}
