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
//   * does ?path= survive the sign-in step it was added in front of?
//   * is the dashboard refused to a member and served to an admin?
//   * do its sort, its filters and its refresh actually change what is on screen?
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
  await pop.evaluate(() =>
    [...document.querySelectorAll("button")]
      .find((b) => /sign in with google/i.test(b.innerText))
      ?.click(),
  );
  await pop.waitForEvent("close", { timeout: 20000 }).catch(() => {});
  await pg.waitForTimeout(2500);
}

const browser = await chromium.launch();
const csp = [];
const errs = [];

console.log("\nthe join flow, driven in a real browser\n");
console.log("-- a student signs up --");
{
  const pg = await (await browser.newContext({ viewport: { width: 1440, height: 1300 } })).newPage();
  pg.on("console", (m) => {
    if (/Content Security Policy|violates|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 140));
  });
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));

  // Arrive the way a closing CTA sends somebody, so preselection is genuinely exercised.
  await pg.goto(`${BASE}/join?path=program-track`, { waitUntil: "networkidle" });
  await pg.waitForTimeout(1200);
  ok("the sign-in step is what a signed-out reader sees",
    /sign in with your college account/i.test(await pg.locator("main").innerText()));

  // An address off the domain must be refused, and the message must name it.
  await signIn(pg, "outsider@gmail.com", "Outsider");
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
  await signIn(pg, "asha@sst.scaler.com", "Asha Verma");

  ok("a college address reaches the details form",
    await pg.getByRole("button", { name: /finish joining/i }).isVisible().catch(() => false));
  ok("the signed-in address is shown back", (await pg.locator("main").innerText()).includes("asha@sst.scaler.com"));
  ok("the name is prefilled from Google", (await pg.locator("#pf-name").inputValue()) === "Asha Verma");
  // The behaviour smoke.mjs cannot reach from a signed-out browser.
  ok("?path= survives the sign-in step", (await pg.locator("#pf-path").inputValue()) === "program-track");

  await pg.goto(`${BASE}/join?path=not-a-real-path`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(2500);
  ok("a hand-edited ?path is ignored", (await pg.locator("#pf-path").inputValue()) === "");
  // The four fields cut from sign-up. Asserted absent so putting one back is a visible
  // decision rather than something that reappears with a stray merge.
  ok("the form asks nothing it does not read",
    (await pg.evaluate(() =>
      ["why", "heard_from", "interests", "updates"].filter(
        (n) => document.querySelector(`[name="${n}"]`) !== null,
      ),
    )).length === 0);

  await pg.fill("#pf-year", "2nd year, CSE");
  await pg.selectOption("#pf-hostel", "uniworld-1");
  await pg.check('input[name="level"][value="none"]');
  await pg.selectOption("#pf-path", "build-day");
  await pg.check('input[name="programs"][value="gsoc"]');
  await pg.getByRole("button", { name: /finish joining/i }).click();
  await pg.getByText(/that.s you signed up/i).waitFor({ timeout: 25000 }).catch(() => {});
  ok("the details save", /that.s you signed up/i.test(await pg.locator("main").innerText()));
  ok("codes are shown back as labels, not raw values",
    (await pg.locator("main").innerText()).includes("Uniworld 1"));

  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(2500);
  ok("the session survives a reload", /that.s you signed up/i.test(await pg.locator("main").innerText()));

  // The second save. This is the path that only breaks the second time somebody uses the
  // page — created_at must stay put while updated_at moves, and the client must merge.
  await pg.getByRole("button", { name: /edit my details/i }).click();
  await pg.waitForTimeout(800);
  await pg.fill("#pf-year", "3rd year, ECE");
  await pg.getByRole("button", { name: /save changes/i }).click();
  await pg.getByText(/that.s you signed up/i).waitFor({ timeout: 25000 }).catch(() => {});
  ok("an edit saves", (await pg.locator("main").innerText()).includes("3rd year, ECE"));

  ok("a member is not offered the dashboard",
    !(await pg.getByRole("link", { name: /^dashboard$/i }).first().isVisible().catch(() => false)));
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
    doc?.fields.email.stringValue === "asha@sst.scaler.com");
  ok("created_at was frozen while updated_at moved",
    Boolean(doc) &&
      new Date(doc.fields.created_at.timestampValue) < new Date(doc.fields.updated_at.timestampValue));
  await pg.close();
}

console.log("\n-- an organiser opens the dashboard --");
{
  // Admins are seeded with the owner token because no client may write that collection —
  // exactly as a human does it in the Firebase console.
  await fetch(`${REST}/admins/organiser@sst.scaler.com`, {
    method: "PATCH",
    headers: OWNER,
    body: JSON.stringify({ fields: { added_by: { stringValue: "console" } } }),
  });

  const pg = await (await browser.newContext({ viewport: { width: 1440, height: 1500 } })).newPage();
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
  await pg.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await pg.waitForTimeout(1000);
  await signIn(pg, "organiser@sst.scaler.com", "Club Organiser");

  ok("an admin with no details of their own still gets the dashboard link",
    await pg.getByRole("link", { name: /^dashboard$/i }).first().isVisible().catch(() => false));

  await pg.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(4000);
  // innerText is the RENDERED text and .label uppercases via CSS, so compare lowercased.
  const t = (await pg.locator("main").innerText()).toLowerCase();
  ok("the dashboard renders for an admin", !t.includes("not for you"));
  ok("it counts the membership", /registered members\s*1\b/.test(t), t.match(/registered members\s*\d+/)?.[0] ?? "");
  const heads = ["by hostel", "by year", "by branch", "by experience", "by route in", "programmes of interest"];
  ok("all six breakdowns render", heads.every((h) => t.includes(h)));
  ok("the member is listed", t.includes("asha@sst.scaler.com"));
  ok("year and branch are parsed from the free-text field", /year 3/.test(t) && /\bece\b/.test(t));

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
    ["zara", "Zara Qureshi", "1st year, CSE", "uniworld-2", "none", ["other"], "Season of Docs", 0],
    ["arun", "Arun Iyer", "2nd year, ME", "uniworld-1", "merged", ["lfx"], null, 40],
  ];
  for (const [uid, name, yb, hostel, level, programs, other, daysAgo] of seeded) {
    const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const fields = {
      uid: { stringValue: uid }, email: { stringValue: `${uid}@sst.scaler.com` },
      name: { stringValue: name }, year_branch: { stringValue: yb },
      hostel: { stringValue: hostel }, level: { stringValue: level },
      path: { stringValue: "build-day" },
      programs: { arrayValue: { values: programs.map((v) => ({ stringValue: v })) } },
      created_at: { timestampValue: ts }, updated_at: { timestampValue: ts },
    };
    if (other) fields.programs_other = { stringValue: other };
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
  // programs_other was collected, validated and exported but never displayed, so the one
  // programme a member had to type was the one an organiser could not see.
  ok("the free text behind 'other' is visible", t3.includes("season of docs"));

  const names = async () => pg.locator("tbody tr td:first-child").allInnerTexts();
  await pg.getByRole("button", { name: /^name/i }).click();
  await pg.waitForTimeout(500);
  const asc = await names();
  ok("sorting by name puts A first", asc[0].trim() === "Arun Iyer", asc.join(" | "));
  await pg.getByRole("button", { name: /^name/i }).click();
  await pg.waitForTimeout(500);
  const desc = await names();
  ok("clicking the same header again reverses it", desc[0].trim() === "Zara Qureshi", desc.join(" | "));

  await pg.getByLabel("Filter by year").selectOption("Year 1");
  await pg.waitForTimeout(500);
  // Lowercased for the same reason as t3: .label uppercases in CSS, and innerText
  // returns the rendered text, so "Registered members" comes back shouting.
  const t4 = (await pg.locator("main").innerText()).toLowerCase();
  ok("the year filter narrows the table", /1 of 3 shown/.test(t4), t4.match(/\d+ of \d+ shown/)?.[0] ?? "");
  ok("an active filter is announced", /1 filter on/.test(t4));
  ok("the totals still count everybody", /registered members\s*3\b/.test(t4));

  await pg.getByLabel("Filter by experience").selectOption("merged");
  await pg.waitForTimeout(500);
  ok("two filters combine rather than replace",
    /no member matches/i.test(await pg.locator("main").innerText()));

  await pg.getByRole("button", { name: /^clear 2$/i }).click();
  await pg.waitForTimeout(500);
  ok("clear restores every row", /3 of 3 shown/.test(await pg.locator("main").innerText()));

  await pg.close();
}

ok("no CSP violations anywhere in the flow", csp.length === 0, csp.slice(0, 2).join(" | "));
ok("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));

await browser.close();
console.log(
  fail === 0
    ? `\n  ${pass} passed. Sign-in, the details form, the edit, and the dashboard all work.\n`
    : `\n  ${pass} passed, ${fail} FAILED.\n`,
);
process.exit(fail === 0 ? 0 : 1);
