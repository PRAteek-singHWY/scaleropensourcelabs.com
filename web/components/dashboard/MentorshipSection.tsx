"use client";

// The mentorship section, on its own route.
//
// IT WAS THE LAST THING ON THE OVERVIEW, below four panels and a two-column grid, and that
// was the wrong place for it twice over. It is the club's headline activity — the reason
// most people join — and it is a decision made once a term rather than something read
// weekly, so it was both buried and mixed in with things that change every week.
//
// On its own route it gets the whole column, which the picker genuinely needs: choosing a
// mentor means reading several descriptions side by side, and that is a page, not a panel.

import RequireProfile from "@/components/dashboard/RequireProfile";
import SectionHead from "@/components/dashboard/SectionHead";
import MentorPicker from "@/components/MentorPicker";

export default function MentorshipSection() {
  return (
    <RequireProfile loading="Loading the cohort…">
      {({ user }) => (
        <>
          <SectionHead eyebrow="Programmes" title="Mentorship.">
            The club runs a Google Summer of Code cohort: weekly sessions, proposal review,
            and a mentor who has been through it recently. Enrolling records a preference —
            an organiser pairs the cohort by hand once it closes.
          </SectionHead>
          <MentorPicker user={user} />
        </>
      )}
    </RequireProfile>
  );
}
