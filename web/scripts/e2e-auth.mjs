// Drive the whole join flow in a real browser, against the Auth and Firestore emulators.
//
//   Terminal 1:  npx firebase-tools emulators:start --only firestore,auth --project demo-osc
//   Terminal 2:  cp .env.example .env.local   # then set the emulator lines, see below
//   Terminal 3:  npm run dev -- -p 3007
//   Terminal 4:  SITE_URL=http://localhost:3007 npm run e2e:auth
//
// .env.local needs exactly this to point at the emulator — the values are fake on purpose,
// and a `demo-` project id makes the SDK refuse to reach real Google services, so this
// cannot touch the club's actual data:
//
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-osc
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-osc.firebaseapp.com
//   NEXT_PUBLIC_FIREBASE_API_KEY=demo-key-for-emulator
//   NEXT_PUBLIC_FIREBASE_APP_ID=1:000:web:000
//   NEXT_PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:8080
//
// WHY THIS EXISTS AND WHAT IT COVERS THAT NOTHING ELSE DOES.
//
// scripts/smoke.mjs runs signed out, so it can only assert that /join shows the sign-in
// step and keeps its query string. scripts/rules-emulator.mjs executes the rules with
// forged tokens, so it never touches the UI. Neither can answer the questions that
// actually break this feature:
//
//   * does signInWithPopup work at all under our Content-Security-Policy?
//   * does the profile save, and does the second save (an EDIT) still work?
//   * does ?path= survive the sign-in step AND the two redirects behind it?
//   * does signing in actually land on /onboarding, and finishing it on /dashboard —
//     without either route bouncing the reader back where they came from?
//   * is the batch really read out of the address, and really not stored?
//   * can an organiser publish a mentor from a browser, and can a member then pick one?
//   * is a mentor somebody picked protected from being deleted?
//   * is the dashboard refused to a member and served to an admin?
//   * do its sort, its filters and its refresh actually change what is on screen?
//
// THE REDIRECT QUESTIONS ARE NEW AND ARE THE REASON THIS FILE GREW. The signed-in flow
// used to be one component on one route, which could not be half-redirected. It is three
// routes now, each shipping as static HTML before auth resolves, and the failure mode is
// a loop or a dead stop on a "checking your sign-in" card — neither of which throws, logs
// anything, or looks different from a slow network in a screenshot.
//
// The CSP question is the reason this is worth the machinery. Sign-in needs
// apis.google.com in script-src and the auth domain in frame-src, and when either is
// missing the page renders perfectly, the button is present, the click does nothing, and
// the only trace is a violation in a console nobody has open. That is exactly the failure
// shape that reaches production.
//
// TWO THINGS ABOUT DRIVING THE EMULATOR'S POPUP, both learned the hard way:
//
//   1. Its submit button is Material, and the ripple overlay swallows Playwright's
//      synthetic click — the button reports visible and enabled, the click "succeeds",
//      and nothing happens. A DOM .click() inside evaluate() works.
//   2. Its email field is `#email-input` and is type="text", not type="email", so a
//      [type=email] selector waits forever.
//
// It clears both emulators first. Without that, a second run finds the account already
// registered, the popup offers it to pick instead of showing the add-account form, and
// the suite fails on its own leftovers rather than on the site.

import { chromium } from "playwright";

const BASE = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PROJECT = "demo-osc";
const FS = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`;
const REST = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

// Fail with instructions rather than a stack trace.
for (const [what, url] of [["Firestore", "http://127.0.0.1:8080/"], ["Auth", "http://127.0.0.1:9099/"]]) {
  try {
    await (await fetch(url)).text();
  } catch {
    console.error(
      `\n  No ${what} emulator. Start both from the repo root:\n` +
        `    npx firebase-tools emulators:start --only firestore,auth --project ${PROJECT}\n`,
    );
    process.exit(1);
  }
}
// CLEARING IS VERIFIED, NOT ASSUMED, and this is not belt-and-braces. Fire-and-forget
// DELETEs gave two red runs in a row that a third run, with no code change, passed
// cleanly. The mechanism: if `asha@sst.scaler.com` survives from the previous run, the
// step that creates her hits an account that already exists, the emulator popup never
// closes, and the suite times out on `#pf-name` — a failure that reads as a broken
// details form when the form is fine. Anything that makes a run depend on the run before
// it is worse than no test, because it teaches you to re-run instead of to look.
for (const url of [FS, AUTH]) await fetch(url, { method: "DELETE" }).catch(() => {});
{
  // FIRESTORE IS VERIFIED TOO, and it was not. Only the Auth clear below was checked,
  // which left exactly the same fire-and-forget race on the other half: a profile written
  // by an earlier run survived the DELETE, the membership table then held four rows where
  // the suite expected three, and SIX assertions failed at once — counts, sort, filters —
  // none of which had anything wrong with them. A suite that depends on the run before it
  // teaches you to re-run instead of to look.
  const countDocs = async () => {
    let n = 0;
    for (const c of ["users", "mentors", "enrollments", "admins"]) {
      try {
        const r = await fetch(`${REST}/${c}`, { headers: OWNER });
        n += ((await r.json())?.documents ?? []).length;
      } catch {
        /* a collection that does not exist yet is zero documents */
      }
    }
    return n;
  };
  let docs = await countDocs();
  for (let i = 0; i < 20 && docs > 0; i++) {
    await fetch(FS, { method: "DELETE" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
    docs = await countDocs();
  }
  if (docs > 0) {
    console.error(
      `\n  The Firestore emulator still holds ${docs} document(s) after clearing. Restart it:\n` +
        `    npx firebase-tools emulators:start --only firestore,auth --project ${PROJECT}\n`,
    );
    process.exit(1);
  }
}
{
  const listAccounts = async () => {
    try {
      const r = await fetch(
        `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`,
        { method: "POST", headers: OWNER, body: "{}" },
      );
      return (await r.json())?.userInfo?.length ?? 0;
    } catch {
      return 0;
    }
  };
  let left = await listAccounts();
  for (let i = 0; i < 20 && left > 0; i++) {
    await fetch(AUTH, { method: "DELETE" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
    left = await listAccounts();
  }
  if (left > 0) {
    console.error(
      `\n  The Auth emulator still holds ${left} account(s) after clearing. Restart it:\n` +
        `    npx firebase-tools emulators:start --only firestore,auth --project ${PROJECT}\n`,
    );
    process.exit(1);
  }
}

/** Sign in through the emulator's popup as a brand-new account. */
async function signIn(pg, email, name) {
  const [pop] = await Promise.all([
    pg.waitForEvent("popup", { timeout: 30000 }),
    pg.getByRole("button", { name: /continue with google/i }).click(),
  ]);
  await pop.waitForLoadState("domcontentloaded");
  // A DOM CLICK, AND SCROLLED INTO VIEW FIRST. The emulator's picker lists every account
  // created earlier in the run, so by the time the organiser signs in "Add new account"
  // has been pushed below the fold and Playwright's click lands on nothing — the admin
  // block then failed with a timeout on a selector three steps later, which looks like a
  // dashboard fault rather than a picker one. It cost two misdiagnosed red runs.
  await pop.waitForTimeout(400);
  const added = await pop.evaluate(() => {
    const el = [...document.querySelectorAll("button, a, [role=button]")]
      .find((n) => /add new account/i.test(n.innerText || ""));
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  });
  if (!added) throw new Error("emulator picker: could not find 'Add new account'");
  await pop.waitForTimeout(700);
  await pop.locator("#email-input").fill(email);
  await pop.locator("#display-name-input").fill(name);
  await settle(pop, email, () =>
    pop.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((n) =>
        /sign in with google/i.test(n.innerText),
      );
      b?.click();
      return Boolean(b);
    }),
  );
  await pg.waitForTimeout(2500);
}

/** Press the emulator's submit until the popup actually goes away.
 *
 *  ONE CLICK IS NOT ENOUGH, and this is not paranoia. The emulator's form is Angular:
 *  Playwright's fill() updates the model, but a click dispatched in the same tick can
 *  land before the form is valid, and the button then does nothing at all — no error, no
 *  navigation, the form simply still sitting there. It failed about one run in three, and
 *  always on the third or later sign-in, which is what made it look like a problem with
 *  whoever was signing in rather than with the timing.
 *
 *  Retrying is safe: once the popup has gone, `isClosed()` is true and the loop stops, and
 *  a click on a form that already submitted has nothing to hit.
 *
 *  It throws with what the popup was SHOWING rather than "never closed", because the
 *  latter sends you reading the wrong file — this suite's whole design principle. */
async function settle(pop, email, press) {
  for (let i = 0; i < 6; i++) {
    if (pop.isClosed()) return;
    const found = await press().catch(() => false);
    if (i === 0 && !found) throw new Error(`emulator popup: no submit control for ${email}`);
    const closed = await pop
      .waitForEvent("close", { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (closed || pop.isClosed()) return;
  }
  const where = pop.url();
  const what = await pop.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => "?");
  throw new Error(
    `emulator popup never closed for ${email}\n    at ${where}\n    showing: ${what.replace(/\n+/g, " / ")}`,
  );
}

// THERE IS NO "SIGN IN AGAIN AS AN EXISTING ACCOUNT" HELPER, and that is a decision worth
// recording because it looks like an omission.
//
// The member appears twice in this suite: once to join, and again later to enrol in
// mentorship after an organiser has published a mentor. The obvious way to write that is
// a second sign-in that picks the existing account out of the emulator's chooser. It does
// not work reliably: the chooser renders each account as a nest of divs with the click
// handler somewhere up the tree, and neither a Playwright click nor a dispatched one on
// the leaf reliably selects a row — six attempts, still sitting on the picker.
//
// So the member's page is simply KEPT OPEN between the two blocks instead, which is both
// more reliable and closer to what actually happens: a student does not sign in twice in
// an afternoon, they come back to a tab that is still signed in.

// WARM THE ROUTES UP BEFORE MEASURING ANYTHING. `next dev` compiles a route the first
// time it is requested, and this suite is usually the first thing that has ever asked for
// /onboarding or /dashboard — so the very first client-side redirect into one of them
// took longer than the assertion waiting for it, and the run failed claiming sign-in had
// not redirected. It had; the destination was still being built.
//
// The tell was that the same run passed on a second attempt with no code change, which is
// the signature of a warm-up problem rather than a real one. Requesting each route once,
// up front, moves that cost outside the measurements. It costs a second and it is the
// difference between a suite you trust and one you re-run.
for (const r of ["/", "/join", "/onboarding", "/dashboard", "/admin", "/privacy"]) {
  await fetch(BASE + r).catch(() => {});
}

const browser = await chromium.launch();
const csp = [];
const errs = [];

/** The member who goes through the whole flow. A REAL-SHAPED ADDRESS: the batch, branch
 *  and roll are read out of it by web/lib/batch.ts, so `asha@sst.scaler.com` would sign in
 *  perfectly and exercise none of that. 23 -> the 2023-27 batch. */
const MEMBER_MAIL = "asha.23bcs10045@sst.scaler.com";
const ADMIN_MAIL = "organiser@sst.scaler.com";
/** Both pages outlive the block that signs them in — see the note above the sign-in
 *  helpers. The member joins, the organiser publishes a mentor, the member comes back to
 *  enrol, and the organiser looks at who picked whom: four blocks, two sessions. */
let adminPg = null;
let memberPg = null;

console.log("\nthe join flow, driven in a real browser\n");
console.log("-- a student signs up --");
{
  const pg = await (await browser.newContext({ viewport: { width: 1440, height: 1600 } })).newPage();
  // Kept open for the mentorship block, which comes back as this same signed-in student.
  memberPg = pg;
  pg.on("console", (m) => {
    if (/Content Security Policy|violates|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 140));
  });
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));

  // Arrive the way a closing CTA sends somebody, so preselection is genuinely exercised.
  await pg.goto(`${BASE}/join?path=program-track`, { waitUntil: "networkidle" });
  await pg.waitForTimeout(1200);
  ok("the sign-in step is what a signed-out reader sees",
    /sign in with your college account/i.test(await pg.locator("main").innerText()));

  // THE ONE CONTROL ON THE CARD OWNS THE COLUMN. A primary action that spans its
  // container is a bigger tap target and cannot be missed; asserted as a ratio rather
  // than a pixel count so it survives any change to the card's padding.
  {
    const [bw, cw] = await pg.evaluate(() => [
      document.querySelector("#apply button.btn-primary").getBoundingClientRect().width,
      document.querySelector("#apply .rounded-panel").clientWidth,
    ]);
    ok("the sign-in button spans the card", bw / cw > 0.75, `${Math.round(bw)}px in ${cw}px`);
  }

  // THE WORKING STATE, ASSERTED MID-FLIGHT. It exists for about a second and it is the
  // difference between a reader waiting and a reader clicking again — and clicking again
  // is how you get auth/cancelled-popup-request, which then looks like a broken button.
  {
    const btn = pg.locator("#apply button.btn-primary");
    const popping = pg.waitForEvent("popup", { timeout: 15000 });
    await btn.click();
    await pg.waitForTimeout(150);
    ok("the button says what is happening while it happens",
      /redirecting to google/i.test(await btn.innerText()));
    // NOT "and cannot be pressed twice". It deliberately can: Firebase takes five to
    // seven seconds to notice a closed popup, so a button disabled for the duration is
    // a dead control at exactly the moment somebody wants to pick another account.
    ok("and stays pressable, so a closed chooser is not a dead end",
      !(await btn.isDisabled()));
    ok("while still announcing itself as busy",
      (await btn.getAttribute("aria-busy")) === "true");
    ok("with a spinner, not only a label",
      (await btn.locator("svg.animate-spin").count()) === 1);
    // Closing the chooser must hand the card back. A `busy` that is set on click and
    // only cleared on success leaves the one control on the page disabled forever, and
    // the reader's only way out is a reload.
    const pop = await popping.catch(() => null);
    await pop?.close();
    await pg.waitForTimeout(1200);
    ok("and pressing it again reopens the chooser rather than doing nothing",
      await (async () => {
        const again = pg.waitForEvent("popup", { timeout: 12000 });
        await btn.click();
        const p2 = await again.catch(() => null);
        await p2?.close();
        return Boolean(p2);
      })());
  }

  // The three links in the card's footer. Google will not publish an OAuth consent
  // screen without a reachable privacy policy, so these are a release requirement and
  // not decoration — and a sign-in card with dead links is worse than one with none.
  {
    const hrefs = await pg.evaluate(() =>
      [...document.querySelectorAll('#apply a[href^="/privacy"]')].map((a) => a.getAttribute("href")),
    );
    ok("the card links privacy, terms and data deletion", hrefs.length === 3, hrefs.join(" "));
    const targets = [];
    for (const h of hrefs) {
      await pg.goto(`${BASE}${h}`, { waitUntil: "domcontentloaded" });
      await pg.waitForTimeout(400);
      const id = h.split("#")[1];
      targets.push(await pg.evaluate((i) => Boolean(document.getElementById(i)), id));
    }
    ok("and every one lands on a section that exists", targets.every(Boolean), targets.join(","));
    ok("the page says how to get your data deleted",
      /delete your record/i.test(await pg.locator("main").innerText()));
    await pg.goto(`${BASE}/join?path=program-track`, { waitUntil: "networkidle" });
    await pg.waitForTimeout(1500);
  }

  // An address off the domain must be refused, and the message must name it.
  await signIn(pg, "outsider@gmail.com", "Outsider");
  // Waited for rather than read straight away. The refusal is not synchronous with the
  // popup closing — the client has to get the credential back, look at the address and
  // sign the account out again — so reading immediately is a race, and one that loses
  // often enough to have failed a run.
  await pg.locator('[role="alert"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  const refusal = (await pg.locator('[role="alert"]').first().textContent().catch(() => "")) ?? "";
  ok("a non-college address is refused", /not an @sst\.scaler\.com address/i.test(refusal));
  ok("and it stays on the sign-in step",
    /sign in with your college account/i.test(await pg.locator("main").innerText()));
  // A REFUSAL MUST NOT BE A DEAD END. Before this, somebody signed into a personal Gmail
  // on a shared laptop was told their address was wrong and left looking at the same
  // "Continue with Google" button, with nothing saying the fix is to pick another
  // account. The button relabels and the copy names the address they used.
  ok("the refusal names the address that was used",
    (await pg.locator("main").innerText()).includes("outsider@gmail.com"));
  ok("and the button now offers a different account",
    await pg.getByRole("button", { name: /choose a different account/i }).isVisible().catch(() => false));

  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(2000);
  // A REAL-SHAPED COLLEGE ADDRESS, because the batch, branch and roll are now READ OUT OF
  // IT rather than typed. `asha@sst.scaler.com` would sign in perfectly and prove nothing
  // about the one derivation this whole flow now depends on.
  await signIn(pg, MEMBER_MAIL, "Asha Verma");

  // THE HANDOFF. /join no longer holds the form: a signed-in reader is sent to
  // /dashboard, which sends anybody without a profile on to /onboarding. Two redirects,
  // both client-side, both carrying the query string.
  await pg.waitForURL(/\/onboarding/, { timeout: 25000 }).catch(() => {});
  ok("signing in leads out of /join", /\/onboarding/.test(pg.url()), pg.url());
  ok("and lands on the details form",
    await pg.getByRole("button", { name: /finish joining/i }).isVisible().catch(() => false));
  ok("?path= survives sign-in and both redirects",
    new URL(pg.url()).searchParams.get("path") === "program-track", pg.url());

  const onboarding = await pg.locator("main").innerText();
  ok("the signed-in address is shown back", onboarding.includes(MEMBER_MAIL));
  ok("the name is prefilled from Google", (await pg.locator("#pf-name").inputValue()) === "Asha Verma");
  // THE DERIVATION, ON SCREEN. Reading somebody's batch out of their address without
  // showing them is the kind of quiet inference that feels like surveillance when they
  // find out. 23bcs10045 -> 2023-27, BCS, roll 10045.
  ok("the batch is derived from the address and shown", /2023–27/.test(onboarding), onboarding.slice(0, 200));
  ok("so is the branch and the roll", /BCS/.test(onboarding) && /10045/.test(onboarding));
  ok("the carried-in path is stated rather than hidden", /you arrived from/i.test(onboarding));

  // THREE QUESTIONS, NOT SEVEN. Asserted as an exact set of field NAMES — deduplicated,
  // because hostel is a two-tile radio group rather than a select, so it is two controls
  // answering one question. Putting a field back is then a visible decision rather than
  // something that reappears with a stray merge, and taking one away breaks a test
  // instead of quietly shortening the form.
  ok("the form asks exactly three things",
    (await pg.evaluate(() =>
      [...new Set(
        [...document.querySelectorAll("form input:not([type=hidden]), form select, form textarea")]
          .map((n) => n.getAttribute("name"))
          .filter(Boolean),
      )].sort().join(","),
    )) === "github,hostel,name");
  // The hostel question is two tiles, not a dropdown — there are two hostels and there
  // always will be until a third building exists, so hiding a two-way choice behind a tap
  // and a scrolling list was the most form-like control on the screen spent on the
  // question with the fewest answers.
  ok("hostel is a pair of tiles rather than a dropdown",
    (await pg.locator('input[name="hostel"]').count()) === 2 &&
      (await pg.locator("#pf-hostel").getAttribute("type")) === "radio");
  // The eight fields cut from sign-up over time.
  ok("and nothing it does not read",
    (await pg.evaluate(() =>
      ["why", "heard_from", "interests", "updates", "year_branch", "level", "programs", "programs_other"]
        .filter((n) => document.querySelector(`[name="${n}"]`) !== null),
    )).length === 0);

  await pg.goto(`${BASE}/onboarding?path=not-a-real-path`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(2500);
  ok("a hand-edited ?path is ignored rather than saved",
    !/you arrived from/i.test(await pg.locator("main").innerText()));

  await pg.goto(`${BASE}/onboarding?path=build-day`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(2500);
  await pg.fill("#pf-name", "Asha Verma");
  await pg.fill("#pf-github", "asha");
  await pg.check('input[name="hostel"][value="uniworld-1"]');
  await pg.getByRole("button", { name: /finish joining/i }).click();

  await pg.waitForURL(/\/dashboard/, { timeout: 25000 }).catch(() => {});
  ok("finishing the form leads to the dashboard", /\/dashboard/.test(pg.url()), pg.url());
  // ARRIVING IS NOT THE SAME AS HAVING RENDERED. The route resolves the moment the URL
  // changes, but the dashboard still has to read the profile back — so reading innerText
  // here without waiting measures the "loading your dashboard" card and reports the save
  // as broken.
  await pg.getByText(/you are on the list/i).waitFor({ timeout: 25000 }).catch(() => {});
  const dash = await pg.locator("main").innerText();
  ok("the details save", /you are on the list/i.test(dash));
  ok("codes are shown back as labels, not raw values", dash.includes("Uniworld 1"));
  ok("the batch is on the dashboard too", /2023–27/.test(dash));

  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(3000);
  ok("the session survives a reload", /you are on the list/i.test(await pg.locator("main").innerText()));
  // AND IT DOES NOT BOUNCE BACK TO ONBOARDING. A member with a complete profile who is
  // sent to the form again would be stuck in a loop between two routes, which is the
  // specific risk of splitting this flow across pages at all.
  ok("and does not bounce back to onboarding", /\/dashboard/.test(pg.url()), pg.url());

  // Until an organiser publishes a mentor there is nothing to enrol in, and the card says
  // so rather than offering a button that cannot work.
  ok("mentorship is honestly closed before any mentor exists",
    /no mentors have been published yet/i.test(await pg.locator("main").innerText()));

  // The second save. This is the path that only breaks the second time somebody uses the
  // page — created_at must stay put while updated_at moves, and the client must merge.
  // "Edit", not "Edit my details" — the dashboard's details section carries its own
  // heading now, so the link does not have to repeat what it edits.
  await pg.getByRole("link", { name: /^edit$/i }).click();
  await pg.waitForURL(/\/onboarding/, { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(2000);
  ok("editing reaches the form rather than being redirected away",
    await pg.getByRole("button", { name: /save changes/i }).isVisible().catch(() => false));
  await pg.fill("#pf-name", "Asha V Verma");
  await pg.getByRole("button", { name: /save changes/i }).click();
  await pg.waitForURL(/\/dashboard/, { timeout: 25000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  ok("an edit saves", (await pg.locator("main").innerText()).includes("Asha V Verma"));

  // MATCHED ON THE DESTINATION, NOT ON THE WORDING. This asserted a link named
  // /organisers.* dashboard/i, and the shell's two routes to /admin are labelled
  // "Organisers" — so the assertion stopped matching the thing it was written to catch
  // and passed on a page that could have carried both links. An href cannot drift out of
  // step with itself, so it counts anchors pointing at the page instead.
  //
  // IT COUNTS RATHER THAN CHECKING VISIBILITY, because there are two of them —
  // components/dashboard/Shell.tsx puts one in the app bar and one in the sidebar — and
  // the sidebar is `lg:flex`, so at a narrower viewport a leaked row would be in the DOM
  // and invisible. This context is 1440 wide, where both would render.
  ok("a member is offered no route to the organisers' page",
    (await pg.locator('a[href^="/admin"]').count()) === 0);
  await pg.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(3000);
  ok("/admin refuses a member", /not for you/i.test(await pg.locator("main").innerText()));

  // Read the stored document with the owner token: the rules forbid a client read, which
  // is the point, so this is the only way to check what was actually written.
  const stored = await (await fetch(`${REST}/users`, { headers: OWNER })).json();
  const doc = (stored.documents ?? [])[0];
  ok("exactly one document was written", (stored.documents ?? []).length === 1);
  ok("its id is the auth uid", Boolean(doc) && doc.fields.uid.stringValue === doc.name.split("/").pop());
  ok("the stored address is the signed-in one",
    doc?.fields.email.stringValue === MEMBER_MAIL);
  // NOTHING DERIVED IS STORED. The batch is on screen twice and in the database nowhere,
  // which is what makes it impossible for it to disagree with the address beside it.
  ok("no batch, branch or year field was written",
    Boolean(doc) &&
      !["batch", "branch", "year", "year_branch"].some((f) => f in doc.fields),
    Object.keys(doc?.fields ?? {}).join(","));
  ok("the silently carried path was stored", doc?.fields.path?.stringValue === "build-day");
  ok("created_at was frozen while updated_at moved",
    Boolean(doc) &&
      new Date(doc.fields.created_at.timestampValue) < new Date(doc.fields.updated_at.timestampValue));
  // NOT CLOSED. The mentorship block returns as this student.
}

console.log("\n-- an organiser opens the dashboard --");
{
  // Admins are seeded with the owner token because no client may write that collection —
  // exactly as a human does it in the Firebase console.
  await fetch(`${REST}/admins/${ADMIN_MAIL}`, {
    method: "PATCH",
    headers: OWNER,
    body: JSON.stringify({ fields: { added_by: { stringValue: "console" } } }),
  });

  const pg = await (await browser.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
  // Held open: the member enrols in the next block, and this same page is then refreshed
  // to check the interest list. Closed at the very end.
  adminPg = pg;
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
  await pg.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await pg.waitForTimeout(1000);
  await signIn(pg, ADMIN_MAIL, "Club Organiser");

  // AN ORGANISER USUALLY HAS NO PROFILE OF THEIR OWN, so signing in bounces them through
  // /dashboard to /onboarding like anybody else. Asserted because the alternative — a
  // redirect loop, or a dead stop on the "checking" card — is exactly what an
  // admin-shaped edge case in a two-route flow looks like.
  await pg.waitForURL(/\/onboarding/, { timeout: 30000 }).catch(() => {});
  ok("an organiser with no details is sent to onboarding like anybody else",
    /\/onboarding/.test(pg.url()), pg.url());
  await pg.waitForTimeout(1000);

  await pg.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(4000);
  // innerText is the RENDERED text and .label uppercases via CSS, so compare lowercased.
  const t = (await pg.locator("main").innerText()).toLowerCase();
  ok("the dashboard renders for an admin", !t.includes("not for you"));
  ok("it counts the membership", /registered members\s*1\b/.test(t), t.match(/registered members\s*\d+/)?.[0] ?? "");
  const heads = ["by batch", "by year", "by branch", "by hostel", "by route in"];
  ok("all five breakdowns render", heads.every((h) => t.includes(h)));
  ok("the member is listed", t.includes(MEMBER_MAIL));
  // THE REPLACEMENT FOR THE TWO REGEXES. Batch, branch and year used to be guessed from a
  // free-text box, with an "Unparsed" bucket for whatever did not match. They are read
  // from the address now, so these are facts rather than best efforts.
  ok("the batch is derived for the table, not typed", /2023–27/.test(t));
  ok("and so are the branch and the year", /\bbcs\b/.test(t) && /\dth year|\drd year/.test(t));

  await pg.getByLabel("Search members").fill("nobody");
  await pg.waitForTimeout(600);
  const filtered = (await pg.locator("main").innerText()).toLowerCase();
  ok("search narrows the table", filtered.includes("no member matches"));
  ok("but the counts do not move with the filter", /registered members\s*1\b/.test(filtered));

  await pg.getByLabel("Search members").fill("");
  await pg.waitForTimeout(400);

  ok("no horizontal page overflow despite the wide table",
    !(await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));

  // -- SORTING AND FILTERING NEED MORE THAN ONE ROW ---------------------------------
  // With a single member, a sort is indistinguishable from no sort and a filter that
  // drops nobody looks identical to one that is broken. Two more members are written
  // straight through the owner token — the point here is the dashboard's behaviour, not
  // the write path, which the sign-in block above already covered end to end.
  const seeded = [
    ["zara", "zara.25bcs10300@sst.scaler.com", "Zara Qureshi", "uniworld-2", 0],
    ["arun", "arun.24bcs10192@sst.scaler.com", "Arun Iyer", "uniworld-1", 40],
  ];
  for (const [uid, email, name, hostel, daysAgo] of seeded) {
    const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const fields = {
      uid: { stringValue: uid }, email: { stringValue: email },
      name: { stringValue: name }, hostel: { stringValue: hostel },
      path: { stringValue: "build-day" },
      created_at: { timestampValue: ts }, updated_at: { timestampValue: ts },
    };
    await fetch(`${REST}/users/${uid}`, { method: "PATCH", headers: OWNER, body: JSON.stringify({ fields }) });
  }
  await pg.getByRole("button", { name: /^refresh$/i }).click();
  await pg.waitForTimeout(2500);

  const t3 = (await pg.locator("main").innerText()).toLowerCase();
  ok("refresh picks up members added since the page loaded", /registered members\s*3\b/.test(t3));
  // "20 Aug 26" — a two-digit year, which is what the column actually prints.
  ok("the joined date is shown, not just stored", /\d{1,2} [a-z]{3} \d{2}\b/.test(t3));
  ok("the eight-week trend renders", t3.includes("sign-ups, last eight weeks"));
  ok("this week is counted separately from the total", /joined this week\s*2\b/.test(t3));
  // Three batches from three addresses, with no member having typed any of them.
  ok("every batch in the club shows up in the breakdown",
    ["2023–27", "2024–28", "2025–29"].every((b) => t3.includes(b)), t3.match(/20\d\d–\d\d/g)?.join(" ") ?? "");

  // SCOPED TO THE FIRST TABLE. There are two on this page now — members, and the
  // mentorship interest list — and a bare `tbody tr td:first-child` picks up the second
  // one's empty-state row as though it were a member called "Nobody has enrolled yet."
  const names = async () =>
    pg.locator("table").first().locator("tbody tr td:first-child").allInnerTexts();
  await pg.getByRole("button", { name: /^name/i }).click();
  await pg.waitForTimeout(500);
  const asc = await names();
  ok("sorting by name puts A first", asc[0].trim() === "Arun Iyer", asc.join(" | "));
  await pg.getByRole("button", { name: /^name/i }).click();
  await pg.waitForTimeout(500);
  const desc = await names();
  ok("clicking the same header again reverses it", desc[0].trim() === "Zara Qureshi", desc.join(" | "));

  await pg.getByLabel("Filter by batch").selectOption("2025–29");
  await pg.waitForTimeout(500);
  // Lowercased for the same reason as t3: .label uppercases in CSS, and innerText
  // returns the rendered text, so "Registered members" comes back shouting.
  const t4 = (await pg.locator("main").innerText()).toLowerCase();
  ok("the batch filter narrows the table", /1 of 3 shown/.test(t4), t4.match(/\d+ of \d+ shown/)?.[0] ?? "");
  ok("an active filter is announced", /1 filter on/.test(t4));
  ok("the totals still count everybody", /registered members\s*3\b/.test(t4));

  await pg.getByLabel("Filter by hostel").selectOption("uniworld-1");
  await pg.waitForTimeout(500);
  ok("two filters combine rather than replace",
    /no member matches/i.test(await pg.locator("main").innerText()));

  await pg.getByRole("button", { name: /^clear 2$/i }).click();
  await pg.waitForTimeout(500);
  ok("clear restores every row", /3 of 3 shown/.test(await pg.locator("main").innerText()));

  // -- PUBLISHING A MENTOR, THROUGH THE UI ------------------------------------------
  // The one write in this app that is not a member editing their own row, so it is
  // driven rather than seeded: the REST owner token would prove the shape and nothing
  // about whether an organiser can actually do it.
  await pg.getByRole("button", { name: /add a mentor/i }).click();
  await pg.waitForTimeout(400);
  await pg.fill("#am-name", "Priya Nair");
  await pg.fill("#am-description", "Kubernetes and Go. Good on proposal structure; not the person for frontend.");
  await pg.fill("#am-org", "CNCF");
  await pg.fill("#am-github", "priya");
  await pg.getByRole("button", { name: /save mentor/i }).click();
  await pg.waitForTimeout(3000);
  const t5 = await pg.locator("main").innerText();
  ok("an organiser can publish a mentor from the browser", t5.includes("Priya Nair"), t5.slice(-300));
  ok("and the new mentor starts with nobody", /1st: 0 · 2nd: 0/.test(t5));

  // A second one, seeded, because the picker needs two to have a second preference at all
  // and the write path is already proven above.
  const now = new Date().toISOString();
  await fetch(`${REST}/mentors/mentor-arjun`, {
    method: "PATCH",
    headers: OWNER,
    body: JSON.stringify({
      fields: {
        name: { stringValue: "Arjun Rao" },
        description: { stringValue: "Rust, and first-time contributors. Ask about reading an unfamiliar codebase." },
        programme: { stringValue: "gsoc" },
        active: { booleanValue: true },
        created_at: { timestampValue: now }, updated_at: { timestampValue: now },
      },
    }),
  });

  // A THIRD, HIDDEN. It must not appear in the member's picker, and it must still resolve
  // to a name anywhere it is already referenced.
  await fetch(`${REST}/mentors/mentor-retired`, {
    method: "PATCH",
    headers: OWNER,
    body: JSON.stringify({
      fields: {
        name: { stringValue: "Retired Mentor" },
        description: { stringValue: "Ran last year's cohort and is not taking students this term." },
        programme: { stringValue: "gsoc" },
        active: { booleanValue: false },
        created_at: { timestampValue: now }, updated_at: { timestampValue: now },
      },
    }),
  });
}

console.log("\n-- the member enrols in mentorship --");
{
  const pg = memberPg;
  // The same signed-in student, coming back to a tab that never signed out. Arriving via
  // /join rather than straight to /dashboard so the "already joined" hand-off is
  // exercised: a member who has finished onboarding must go to the dashboard, not be sent
  // round the onboarding form again.
  await pg.goto(`${BASE}/join`, { waitUntil: "domcontentloaded" });
  await pg.waitForURL(/\/dashboard/, { timeout: 25000 }).catch(() => {});
  ok("a member who has already joined goes straight to the dashboard",
    /\/dashboard/.test(pg.url()), pg.url());

  await pg.getByRole("button", { name: /start my enrolment/i }).waitFor({ timeout: 25000 }).catch(() => {});
  ok("mentorship is open now that a mentor exists",
    await pg.getByRole("button", { name: /start my enrolment/i }).isVisible().catch(() => false));

  await pg.getByRole("button", { name: /start my enrolment/i }).click();
  await pg.waitForTimeout(600);
  const picker = await pg.locator("main").innerText();
  ok("the picker lists the published mentors", picker.includes("Priya Nair") && picker.includes("Arjun Rao"));
  ok("and the description, which is what somebody chooses on", picker.includes("proposal structure"));
  // HIDDEN MEANS HIDDEN FROM THE PICKER. The rules deliberately still return the
  // document, so this is a client filter and worth asserting rather than assuming.
  ok("a hidden mentor is not offered", !picker.includes("Retired Mentor"));

  // STEP ONE: the first choice, on its own screen. The two lists used to be stacked on
  // one page with a checkbox between them; now each step asks one question.
  ok("step one cannot be left without a first choice",
    await pg.getByRole("button", { name: /^next$/i }).isDisabled());
  // CLICK THE LABEL, NOT THE INPUT. The radios are `sr-only` — the card is the control —
  // so a click aimed at the input is intercepted by the label wrapping it. Playwright
  // reports "label intercepts pointer events" and retries for thirty seconds.
  await pg.locator('label:has(input[name="mentor_1"])').first().click();
  await pg.waitForTimeout(300);
  // WHICH MENTOR WAS PICKED IS READ BACK, NOT ASSUMED. readMentors() orders by name, so
  // "the first card" is whoever sorts first — and hard-coding a name here made the
  // assertions depend on an ordering nothing promises. The id is what the document
  // stores, so it is what the checks below compare against.
  const pickedFirst = await pg.locator('input[name="mentor_1"]:checked').inputValue();
  // The card's first line is the mentor's name — the org and the description are their
  // own blocks below it. Read off the card rather than from a `p`, because the card is
  // built out of spans: a label wrapping an sr-only radio cannot contain block elements
  // and still be valid.
  const pickedFirstName = (
    await pg.locator('label:has(input[name="mentor_1"]:checked)').first().innerText()
  ).split("\n")[0].trim();
  await pg.getByRole("button", { name: /^next$/i }).click();
  await pg.waitForTimeout(500);

  // STEP TWO. The mentor picked on step one is NOT offered again — the single-screen
  // version had to render them disabled with a line explaining why, and not offering them
  // says the same thing in no words. Two published mentors, so exactly one remains, plus
  // the "just my first preference" card.
  ok("step two drops the mentor already chosen",
    (await pg.locator('input[name="mentor_2"]').count()) === 2,
    `${await pg.locator('input[name="mentor_2"]').count()} options`);
  ok("and names the first choice back rather than making you remember it",
    /your first choice is/i.test(await pg.locator("main").innerText()));
  ok("enrol is off until step two is answered",
    await pg.getByRole("button", { name: /^enrol$/i }).isDisabled());
  ok("with the reason stated rather than left to guess at",
    /choose a backup, or say you only want your first choice/i.test(
      await pg.locator("main").innerText(),
    ));

  // THE ESCAPE HATCH IS A CARD IN THE SAME GROUP, not a checkbox beside the list. That is
  // what makes "I only want my first choice" a decision the data can hold rather than an
  // absence it has to infer.
  await pg.locator('label:has(input[name="mentor_2"][value="__none__"])').click();
  await pg.waitForTimeout(400);
  ok("choosing 'just my first preference' completes the answer",
    !(await pg.getByRole("button", { name: /^enrol$/i }).isDisabled()));

  await pg.getByRole("button", { name: /^enrol$/i }).click();
  await pg.waitForTimeout(3500);
  const enrolled = await pg.locator("main").innerText();
  ok("the enrolment saves", /enrolled/i.test(enrolled) && enrolled.includes(pickedFirstName),
    pickedFirstName);
  ok("and says plainly that it is not an allocation", /not a confirmed mentor yet/i.test(enrolled));
  ok("a first-preference-only choice reads as a decision, not a blank",
    /you asked for your first preference only/i.test(enrolled));

  // CHANGING YOUR MIND. This is the edit path, and it is the one that would break on a
  // stale mentor_2: switching to two preferences and back has to leave the document
  // valid both times, which the rules refuse if the client forgets to delete the field.
  await pg.getByRole("button", { name: /change my preferences/i }).click();
  await pg.waitForTimeout(600);
  // Re-opening starts at step one with the stored answers, so the first choice is already
  // made and Next is live. Asserted, because "edit" resuming at a blank step one would
  // silently make every change a re-entry of both answers.
  ok("editing reopens at step one with the stored first choice",
    (await pg.locator('input[name="mentor_1"]:checked').count()) === 1 &&
      !(await pg.getByRole("button", { name: /^next$/i }).isDisabled()));
  await pg.getByRole("button", { name: /^next$/i }).click();
  await pg.waitForTimeout(500);
  // The first real mentor on step two — necessarily somebody other than the first choice,
  // since that one is not in this list at all.
  await pg.locator('label:has(input[name="mentor_2"]:not([value="__none__"]))').first().click();
  const pickedSecond = await pg.locator('input[name="mentor_2"]:checked').inputValue();
  await pg.getByRole("button", { name: /save my preferences/i }).click();
  await pg.waitForTimeout(3500);
  const both = await pg.locator("main").innerText();
  ok("switching to two preferences saves",
    both.includes("Priya Nair") && both.includes("Arjun Rao"), both.slice(0, 120));
  ok("and the first-preference-only line is gone", !/you asked for your first preference only/i.test(both));

  const stored = await (await fetch(`${REST}/enrollments`, { headers: OWNER })).json();
  const en = (stored.documents ?? [])[0];
  ok("exactly one enrollment was written", (stored.documents ?? []).length === 1);
  ok("keyed by the member's uid", Boolean(en) && en.fields.uid.stringValue === en.name.split("/").pop());
  ok("holding exactly the two mentors that were picked",
    en?.fields.mentor_1?.stringValue === pickedFirst &&
      en?.fields.mentor_2?.stringValue === pickedSecond &&
      en?.fields.first_only?.booleanValue === false,
    `${en?.fields.mentor_1?.stringValue} / ${en?.fields.mentor_2?.stringValue}`);
  await pg.close();
}

console.log("\n-- the organiser sees who picked whom --");
{
  const pg = adminPg;
  await pg.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(4500);
  const t = await pg.locator("main").innerText();
  const lower = t.toLowerCase();

  ok("the interest list names the student", t.includes("Asha V Verma"));
  ok("with the batch read from their address", /2023–27/.test(t));
  ok("and both preferences", /priya nair/.test(lower) && /arjun rao/.test(lower));
  ok("the enrolled count is stated", /students enrolled\s*1\b/.test(lower), lower.match(/students enrolled\s*\d+/)?.[0] ?? "");
  ok("the published mentor count is stated", /mentors published\s*3\b/.test(lower), lower.match(/mentors published\s*\d+/)?.[0] ?? "");
  ok("first preferences are counted", lower.includes("first preferences"));
  ok("total demand is counted separately", lower.includes("total demand"));
  // The mentor nobody picked is NAMED, not drawn as a bar at zero — a zero-height bar is
  // a row that disappears, and "who has nobody" is a question with an action attached.
  ok("a mentor nobody picked is named rather than shown as an empty bar",
    lower.includes("mentors nobody has picked") && t.includes("Retired Mentor"));

  // THE DELETE GUARD. Firestore rules cannot express "nothing references this document",
  // so the guard is in the client — and this is the only thing that checks it holds.
  ok("a picked mentor cannot be deleted, and says why instead",
    /students? picked this mentor — hide instead/i.test(t));
  const deletes = await pg.getByRole("button", { name: /^delete$/i }).count();
  ok("delete is only offered for a mentor nobody picked", deletes === 1, `${deletes} delete buttons`);

  await pg.getByLabel("Filter by mentor").selectOption({ label: "Arjun Rao" });
  await pg.waitForTimeout(600);
  // Arjun is the SECOND preference, so a filter that only matched first preferences would
  // return nothing here — which is precisely the person an organiser reassigns.
  ok("filtering by mentor matches a second preference too",
    /1 of 1 shown/.test(await pg.locator("main").innerText()));

  await pg.getByLabel("Filter by mentor").selectOption("");
  await pg.waitForTimeout(400);
  ok("no horizontal page overflow with both tables on the page",
    !(await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));

  await pg.close();
}

ok("no CSP violations anywhere in the flow", csp.length === 0, csp.slice(0, 2).join(" | "));
ok("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
console.log(
  fail === 0
    ? `\n  ${pass} passed. Sign-in, onboarding, the dashboard, mentor publishing and enrolment all work.\n`
    : `\n  ${pass} passed, ${fail} FAILED.\n`,
);
process.exit(fail === 0 ? 0 : 1);
