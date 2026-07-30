// Seed the local database with the demo fixtures.
//
//   npx tsx scripts/seed-demo.ts
//
// Uses lib/demo-data.ts, so the data covers the awkward states on purpose, not
// just the happy path: all four contributor-rank states, a sole-contributor repo,
// a partial profile, a missing stack scan, a member with no consent, and a member
// with zero merged PRs (who must therefore have no public page).
//
// Local development only — every name is fictional and no real GitHub account is
// contacted. Safe to re-run: it clears the tables it owns first.

import { PrismaClient } from "@prisma/client";
import {
  DEMO_MENTORS,
  demoDeepProfile,
  type DemoMenteeSeed,
} from "../lib/demo-data";
// Shared with the demo sign-in provider on purpose — when the seed and the
// provider each had their own copy of this identity they drifted, and the demo
// organiser ended up signing in as a different, non-allowlisted user.
import { DEMO_USER, demoAdminLogin } from "../lib/demo";

const prisma = new PrismaClient();

function lastContribution(days: { date: string; count: number }[]): Date | null {
  let latest: string | null = null;
  for (const d of days) {
    if (d.count > 0 && (latest === null || d.date > latest)) latest = d.date;
  }
  return latest ? new Date(`${latest}T00:00:00.000Z`) : null;
}

async function main() {
  console.log("Clearing demo tables…");
  await prisma.repoContrib.deleteMany();
  await prisma.stackScan.deleteMany();
  await prisma.contribProfile.deleteMany();
  await prisma.member.deleteMany();
  await prisma.mentee.deleteMany();
  await prisma.mentor.deleteMany();
  await prisma.event.deleteMany();
  await prisma.gsocIdea.deleteMany();
  await prisma.gsocOrg.deleteMany();

  // ---- The lead (organiser) who owns the mentorship data ----
  const adminLogin = demoAdminLogin();
  const lead = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    create: { email: DEMO_USER.email, name: DEMO_USER.name, login: adminLogin },
    update: { login: adminLogin },
    select: { id: true },
  });
  console.log(`Lead: ${lead.id} (login "${adminLogin}" → admin via ALLOWED_LOGINS)`);

  const allSeeds: DemoMenteeSeed[] = [];

  // ---- Mentors + mentees (the private dashboard side) ----
  for (const m of DEMO_MENTORS) {
    const mentor = await prisma.mentor.create({
      data: { userId: lead.id, name: m.name, github: m.github },
      select: { id: true },
    });
    for (const mentee of m.mentees) {
      await prisma.mentee.create({
        data: {
          mentorId: mentor.id,
          name: mentee.name,
          email: mentee.email,
          github: mentee.github,
        },
      });
      allSeeds.push(mentee);
    }
  }
  console.log(`Mentors: ${DEMO_MENTORS.length}, mentees: ${allSeeds.length}`);

  // ---- Public members + their cached contribution profiles ----
  let publicPages = 0;
  for (const [i, seed] of allSeeds.entries()) {
    const github = seed.github.toLowerCase();
    const profile = demoDeepProfile(seed.github);

    // Deliberate variety so the UI's branches are all reachable locally:
    //   index 4 → consented but NOT approved (must be invisible publicly)
    //   index 6 → approved but no consent  (must be invisible publicly)
    const noConsent = i === 6;
    const notApproved = i === 4;

    await prisma.member.create({
      data: {
        github,
        displayName: seed.name,
        batch: ["2026", "2027", "2028"][i % 3],
        bio:
          i % 2 === 0
            ? "Backend and infrastructure. Currently poking at operator patterns."
            : null,
        email: seed.email,
        notifyInactive: true,
        publicConsent: !noConsent,
        consentedAt: noConsent ? null : new Date(),
        status: notApproved ? "PENDING" : "APPROVED",
        gsocInterested: i % 3 === 0,
        gsocPref1: i % 3 === 0 ? ["CNCF", "Rust Foundation", "OWASP"][i % 3] : null,
        gsocPref2: i % 3 === 0 ? "Kubernetes" : null,
      },
    });

    const created = await prisma.contribProfile.create({
      data: {
        username: github,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        followers: profile.followers,
        publicRepos: profile.publicRepos,
        windowDays: profile.windowDays,
        commitsInWindow: profile.commitsInWindow,
        prsInWindow: profile.prsInWindow,
        issuesInWindow: profile.issuesInWindow,
        reviewsInWindow: profile.reviewsInWindow,
        dailyContributions: profile.dailyContributions,
        totalContributionsInWindow: profile.totalContributionsInWindow,
        lastContributionAt: lastContribution(profile.dailyContributions),
        totalPRs: profile.totalPRs,
        totalMergedPRs: profile.totalMergedPRs,
        totalIssues: profile.totalIssues,
        reposContributedTo: profile.reposContributedTo,
        partial: profile.partial,
        note: profile.note,
        fetchedAt: new Date(),
      },
      select: { id: true },
    });

    if (profile.repos.length > 0) {
      await prisma.repoContrib.createMany({
        data: profile.repos.map((r, pos) => ({
          profileId: created.id,
          position: pos,
          nameWithOwner: r.nameWithOwner,
          url: r.url,
          description: r.description,
          stars: r.stars,
          primaryLanguage: r.primaryLanguage,
          isOwnRepo: r.isOwnRepo,
          isFork: r.isFork,
          commits: r.commits,
          issuesOpened: r.issuesOpened,
          issuesClosed: r.issuesClosed,
          prsOpened: r.prsOpened,
          prsMerged: r.prsMerged,
          prsOpen: r.prsOpen,
          prsClosed: r.prsClosed,
          reviews: r.reviews,
          rank: r.rank,
          rankStatus: r.rankStatus,
          totalContributors: r.totalContributors,
          contributorsExact: r.contributorsExact,
          lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt) : null,
        })),
      });
    }

    if (profile.stack) {
      await prisma.stackScan.create({
        data: {
          profileId: created.id,
          prsScanned: profile.stack.prsScanned,
          filesSeen: profile.stack.filesSeen,
          entries: profile.stack.entries,
          truncated: profile.stack.truncated,
        },
      });
    }

    const visible = !noConsent && !notApproved;
    if (visible && profile.totalMergedPRs >= 1) publicPages += 1;

    console.log(
      `  ${seed.name.padEnd(16)} merged=${String(profile.totalMergedPRs).padStart(3)} ` +
        `repos=${String(profile.repos.length).padStart(2)} ` +
        `stack=${profile.stack ? "yes" : "MISSING"} ` +
        `${notApproved ? "[pending]" : ""}${noConsent ? "[no consent]" : ""}`,
    );
  }

  // ---- A few calendar events so /events isn't empty when it's built ----
  const now = new Date();
  const day = (n: number) => new Date(now.getTime() + n * 86_400_000);
  await prisma.event.createMany({
    data: [
      {
        title: "GSoC 2027 organisation list announced",
        description: "Accepted mentoring organisations are published.",
        kind: "GSOC",
        startsAt: day(120),
        url: "https://summerofcode.withgoogle.com/",
      },
      {
        title: "Hacktoberfest begins",
        description: "Quality over quantity — one real fix beats four throwaways.",
        kind: "HACKTOBERFEST",
        startsAt: day(62),
        endsAt: day(93),
      },
      {
        title: "Club session: contributing live",
        description:
          "Someone contributes on screen, review comments and all. The messy middle nobody shows.",
        kind: "MEETUP",
        startsAt: day(5),
      },
    ],
  });

  console.log(
    `\nDone. ${allSeeds.length} members seeded, ${publicPages} qualify for a public page.`,
  );
  console.log(
    "(Members with 0 merged PRs, no consent, or pending status must NOT have one.)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
