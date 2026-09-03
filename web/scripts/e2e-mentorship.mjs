// Drive the whole mentorship flow in a real browser, against the Auth and Firestore
// emulators: an organiser publishes a mentor, a member enrols, and the enrollment
// document is read back out of Firestore.
//
//   Terminal 1:  npx firebase-tools emulators:start --only firestore,auth --project demo-osc
//   Terminal 2:  npm run dev -- -p 3001
//   Terminal 3:  SITE_URL=http://localhost:3001 npm run e2e:mentorship
//
// WHY THIS EXISTS, AND IT IS NOT "e2e-auth covers it". Two failures in this flow were
// invisible to every other check in this repo, and both shipped:
//
//   1. MemberDashboard stopped rendering MentorPicker at all. An upstream merge kept the
//      component, its library and its firestore rules, and dropped the one line that put
//      it on screen. Typecheck passed, the build passed, the rules tests passed, and a
//      member simply had no way to choose a mentor. Nothing was red.
//
//   2. With exactly ONE mentor published, enrolling always failed. The submit button set
//      `first_only` in its own onClick and the form's submit handler, running in the same
//      React batch, still read the old value — so the write went out as "not first-choice
//      only" with no second choice, which firestore.rules correctly refuses. The reader
//      got "That did not save. The fault is ours rather than yours." That is the state a
//      club is in for the whole period between publishing its first mentor and its
//      second, which is exactly when the first students try to enrol.
//
// Neither is reachable from a rules test — the rules were right both times — and neither
// is reachable from a typecheck. Both need a browser, a real sign-in and a real write.
//
// THE ONE-MENTOR CASE IS THE POINT, so this publishes exactly one and does not
// "helpfully" add a second to make step two appear.

import pw from "playwright";

const { chromium } = pw;
const BASE = (process.env.SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const PROJECT = process.env.FIREBASE_PROJECT ?? "demo-osc";
const DOCS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH_CLEAR = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`;
const FS_CLEAR = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`;

// Fresh addresses per run. The Auth emulator keeps accounts for the life of the process,
// and a second run against the same one lands on the picker's "existing account" path
// rather than the "add new account" path this script drives.
const STAMP = Date.now().toString(36);
const ORG = `organiser.${STAMP}@sst.scaler.com`;
const MEMBER = `member.${STAMP}@sst.scaler.com`;
const MENTOR_NAME = `Test Mentor ${STAMP}`;

let pass = 0;
let fail = 0;
const ok = (label, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${extra ? `  ${extra}` : ""}`);
  }
};

async function up(url, what) {
  try {
    await fetch(url);
    return true;
  } catch {
    console.error(
      `\n  No ${what} emulator. Start both from the repo root:\n` +
        `    npx firebase-tools emulators:start --only firestore,auth --project ${PROJECT}\n`,
    );
    process.exit(1);
  }
}

const owner = { Authorization: "Bearer owner" };

async function listDocs(coll) {
  const r = await fetch(`${DOCS}/${coll}`, { headers: owner });
  if (!r.ok) return [];
  return (await r.json()).documents ?? [];
}

/** Seed the organiser's admins row the way a console edit would — the rules only let an
 *  OWNER write that collection, and there is no owner yet on a clean emulator. */
async function seedAdmin(email) {
  const r = await fetch(`${DOCS}/admins/${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: { ...owner, "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        email: { stringValue: email },
        name: { stringValue: "Test Organiser" },
        role: { stringValue: "owner" },
        active: { booleanValue: true },
        added_by: { stringValue: "console" },
      },
    }),
  });
  return r.ok;
}

/** Sign in through the Auth emulator's popup as a brand-new account.
 *
 *  ALWAYS FROM /dashboard. /admin renders a per-panel "not for you" state rather than a
 *  sign-in card, so there is no button there to start from — an organiser signs in like
 *  anybody else and then navigates. */
async function signIn(ctx, pg, email, name) {
  await pg.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await pg.waitForTimeout(1500);
  const popupP = ctx.waitForEvent("page", { timeout: 30000 });
  await pg.getByRole("button", { name: /continue with google/i }).click();
  const pop = await popupP;
  await pop.waitForLoadState("domcontentloaded");
  await pop.waitForTimeout(600);
  // A DOM click, scrolled into view: the emulator's picker lists every account made
  // earlier in the run, so "Add new account" drifts below the fold.
  const added = await pop.evaluate(() => {
    const el = [...document.querySelectorAll("button, a, [role=button]")].find((n) =>
      /add new account/i.test(n.innerText || ""),
    );
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  });
  if (!added) throw new Error("emulator picker: could not find 'Add new account'");
  await pop.waitForTimeout(700);
  await pop.locator("#email-input").fill(email);
  await pop.locator("#display-name-input").fill(name);
  await pop.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((n) => /sign in with google/i.test(n.innerText))
      ?.click();
  });
  await pg.waitForTimeout(4000);
}

await up(`${DOCS}/mentors`, "Firestore");
await up(AUTH_CLEAR, "Auth");
await fetch(FS_CLEAR, { method: "DELETE" }).catch(() => {});

// POPUP BLOCKING IS OFF ON PURPOSE. Headless Chromium blocks the sign-in popup by
// default and signInWithPopup then neither resolves nor rejects — the button sits on
// "Redirecting to Google…" forever and the failure looks like a broken app.
const browser = await chromium.launch({ args: ["--disable-popup-blocking"] });

console.log("\n-- an organiser publishes one mentor --");
ok("the organiser has an admins row", await seedAdmin(ORG));

const ctxA = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const org = await ctxA.newPage();
const orgErrs = [];
org.on("pageerror", (e) => orgErrs.push(e.message.slice(0, 120)));

await signIn(ctxA, org, ORG, "Test Organiser");
await org.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 60000 });
await org.waitForTimeout(5000);

ok("the organiser reaches the admin page", (await org.getByText(/admin dashboard/i).count()) > 0);

const addBtn = org.getByRole("button", { name: /add a mentor/i });
ok("the admin page offers 'Add a mentor'", (await addBtn.count()) > 0);
if (await addBtn.count()) {
  await addBtn.first().click();
  await org.waitForTimeout(800);
  await org.locator("#am-name").fill(MENTOR_NAME);
  await org.locator("#am-description").fill("Compilers and developer tooling. Good for a first PR.");
  await org.locator("#am-org").fill("Sugar Labs");
  await org.evaluate(() => {
    const form = document.querySelector("#am-name")?.closest("form");
    form?.querySelector("button[type=submit]")?.click();
  });
  await org.waitForTimeout(3000);
}

const mentors = await listDocs("mentors");
ok("a mentor document exists", mentors.length === 1, `(found ${mentors.length})`);
ok("it carries the name that was typed", mentors[0]?.fields?.name?.stringValue === MENTOR_NAME);
ok("it is active, so the picker will offer it", mentors[0]?.fields?.active?.booleanValue === true);
ok("no uncaught errors on the admin page", orgErrs.length === 0, orgErrs.join(" | "));

console.log("\n-- a member enrols --");
const ctxB = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const mem = await ctxB.newPage();
const memErrs = [];
mem.on("pageerror", (e) => memErrs.push(e.message.slice(0, 120)));
mem.on("console", (m) => {
  if (m.type() === "error") memErrs.push("[console] " + m.text().slice(0, 160));
});

await signIn(ctxB, mem, MEMBER, "Test Member");
await mem.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60000 });
await mem.waitForTimeout(5000);

// REGRESSION 1: the section has to be on the page at all.
ok("the Mentorship section is on the dashboard", (await mem.getByText(/mentorship/i).count()) > 0);
ok("it names the programme", (await mem.getByText(/google summer of code/i).count()) > 0);

const start = mem.getByRole("button", { name: /start my enrolment/i });
ok("it offers 'Start my enrolment'", (await start.count()) > 0);

if (await start.count()) {
  await start.first().click();
  await mem.waitForTimeout(1500);
  ok("step one asks who to work with", (await mem.getByText(/who would you most like to work with/i).count()) > 0);
  ok("the published mentor is offered", (await mem.getByText(MENTOR_NAME).count()) > 0);

  // The mentor's OWN radio, found by its label. The profile form on the same page has
  // hostel radios, and picking the first radio on the document selects one of those.
  const picked = await mem.evaluate(() => {
    const r = [...document.querySelectorAll("input[type=radio][name=mentor_1]")][0];
    if (!r) return false;
    r.click();
    return true;
  });
  ok("the mentor can be selected", picked);
  await mem.waitForTimeout(1000);

  const enrolReady = await mem.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^enrol$/i.test(x.innerText.trim()));
    return b ? !b.disabled : false;
  });
  // REGRESSION 2: with one mentor there is no step two, so Enrol must be live on a
  // single choice — and the write it sends must satisfy the rules.
  ok("Enrol is enabled on a single choice", enrolReady);

  await mem.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => /^enrol$/i.test(x.innerText.trim()))?.click();
  });
  await mem.waitForTimeout(4000);
}

const alert = await mem.evaluate(() => document.querySelector("[role=alert]")?.innerText.trim() ?? null);
ok("no error is shown to the member", alert === null, alert ? `(${alert.slice(0, 80)})` : "");
ok("the panel now says enrolled", /enrolled/i.test(await mem.evaluate(() => document.body.innerText)));

const enrolments = await listDocs("enrollments");
ok("an enrollment document was written", enrolments.length === 1, `(found ${enrolments.length})`);
if (enrolments.length) {
  const f = enrolments[0].fields ?? {};
  ok("it records the chosen mentor", f.mentor_1?.stringValue === mentors[0]?.name.split("/").pop());
  ok("it is attributed to the member's own address", f.email?.stringValue === MEMBER);
  // The specific shape the one-mentor bug got wrong.
  ok("one published mentor is stored as first-choice-only", f.first_only?.booleanValue === true);
  ok("and carries no second choice", !("mentor_2" in f));
}
ok("no uncaught errors on the dashboard", memErrs.length === 0, memErrs.join(" | "));

await browser.close();
console.log(
  fail === 0
    ? `\n  ${pass} passed. An organiser can publish a mentor and a member can enrol.\n`
    : `\n  ${pass} passed, ${fail} FAILED.\n`,
);
process.exit(fail === 0 ? 0 : 1);
