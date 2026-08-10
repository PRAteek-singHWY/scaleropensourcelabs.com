# Firebase setup

Everything you need to make the join form actually store applications, and the
reasoning behind the parts that look odd. Written for somebody who has not touched
this repo before.

**You do not need any of this to work on the site.** The site builds, renders and
passes every check with no Firebase project and no `.env.local`. With Firebase
unconfigured the join form renders and validates exactly as normal and tells the
reader plainly that it is not connected. Only set this up if you are working on the
form itself or standing up the real thing.

---

## Quick start

The whole thing, assuming you have a Firebase project already. **Read step 3 and step
4 in full before running them** — one console setting and one deploy are what stand
between this and publishing every applicant's email address.

```bash
# 1. point the CLI at your project (once per machine)
npm install -g firebase-tools
firebase login
cd /path/to/tracje          # repo root — firebase.json lives here
firebase use --add

# 2. deploy the security rules. NOT optional, and not done by the console.
firebase deploy --only firestore:rules

# 3. fill in the six config values from the Firebase console
cd web
cp .env.example .env.local
$EDITOR .env.local

# 4. run it and submit the form for real
npm run dev                 # then open http://localhost:3000/join

# 5. before you change any form option later
npm run rules               # asserts the rules still match the form
```

In the Firebase console you need, in this order: a project → a **web app** (for the
config values) → **Firestore in production mode** → rules deployed → **App Check**
before launch. Each is a numbered step below.

---

## What it does

One form writes to one collection, and nothing reads it back.

```
/join page  ──addDoc()──▶  Firestore collection `applications`
                                      │
                                      ▼
                          organisers read them in the
                          Firebase console (Google account
                          permissions, not these rules)
```

That is the whole architecture. There is no server, no admin SDK, no API route, and
no client anywhere that reads an application. The site stays a static build.

| File | Role |
|---|---|
| `firestore.rules` | **The security boundary.** Read this one properly. |
| `firebase.json` | Tells the Firebase CLI where the rules live. |
| `web/lib/firebase.ts` | Lazy client init. Returns `null` when unconfigured. |
| `web/components/JoinForm.tsx` | The submit handler. |
| `web/scripts/rules.mjs` | Asserts the rules and the form still agree. Runs in CI. |
| `web/.env.example` | The variables, with notes. |

---

## Setup

### 1. Create the project

<https://console.firebase.google.com> → **Add project**. Analytics is not needed and
not used; skip it.

### 2. Create a web app and copy the config

**Project settings** (gear icon) → **General** → **Your apps** → **Add app** → the
web icon (`</>`). Register it, and Firebase shows a `firebaseConfig` object.

Copy `web/.env.example` to `web/.env.local` and fill in the six values:

```bash
cd web
cp .env.example .env.local
```

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123
```

All six must be present. A partially filled config is treated as unconfigured on
purpose — one that initialises and then fails on every request is much harder to
diagnose than one that declines to start.

> **`NEXT_PUBLIC_` is correct here and is not a mistake.** A Firebase web config is
> an identifier, not a credential. Google documents it as publishable and it is
> inlined into the browser bundle by design. Nothing is protected by hiding it; what
> protects applicants is `firestore.rules`. Do not "fix" this by adding a server-side
> proxy — you would be hiding a public identifier and still relying on the same rules.
>
> A **service account key** is the opposite and must never go in this repo or in any
> `NEXT_PUBLIC_` variable.

### 3. Create the database

**Build** → **Firestore Database** → **Create database**. Pick a region close to your
users (`asia-south1` for India) — **the region cannot be changed later.**

When it asks for a starting mode:

> ### Choose "production mode", not "test mode".
>
> Test mode is `allow read, write: if true` for thirty days. Applications contain
> students' names, emails, and college year and branch — test mode makes every one of
> them readable by anyone who opens the site and types two lines into the browser
> console. **This is the single most important step on this page.**
>
> If you already chose test mode, that is fine — step 4 replaces the rules entirely.
> Just do step 4 now rather than later.

### 4. Deploy the rules

```bash
npm install -g firebase-tools     # once
firebase login                    # once
cd /path/to/tracje                # repo root, where firebase.json lives
firebase use --add                # pick your project, give it any alias
firebase deploy --only firestore:rules
```

> **Editing `firestore.rules` changes nothing until you deploy it.** A rules file that
> is correct in git and permissive in production is the worst case, because code review
> passes. After deploying, confirm in the console under **Firestore → Rules** that what
> you see matches the file.

What the rules say, in short:

- `create` — anyone, but only a **validated** document (exact field set, length
  limits, values from closed lists, server timestamp).
- `read` — **nobody**, ever, through any client.
- `update` / `delete` — **nobody**. Applications are immutable once submitted.
- Every other path in the project — closed.

### 5. App Check (do this before launch)

`applications` is a public create-only endpoint. Without attestation it will
eventually be filled by a script.

**Build** → **App Check** → register the web app with **reCAPTCHA v3**. Put the site
key in `.env.local`:

```
NEXT_PUBLIC_FIREBASE_APPCHECK_KEY=6Lc...
```

Leave it **empty locally** — reCAPTCHA cannot be exercised on `localhost` without a
debug token, and the client is written to carry on without App Check rather than fail,
so a real applicant can still apply if attestation breaks.

> Turn **enforcement** on in the console only *after* confirming real submissions carry
> a token. Enforcing first rejects genuine applicants, and the error they see is
> indistinguishable from the site being broken.

### 6. Check it actually works

```bash
cd web && npm run dev
```

Open `/join`, fill the form, submit. You should get **"You're in the queue."**, and a
new document under **Firestore → Data → applications**.

If you get anything else, the table below tells you which of the six things is wrong.

---

### 7. Deploying to production

Two things are easy to miss here, and both present as "it worked on my machine".

**`.env.local` is not deployed.** It is gitignored, so the host has never seen it. Set
the same variables in your host's environment settings — on Vercel that is
**Project → Settings → Environment Variables**. All six `NEXT_PUBLIC_FIREBASE_*`
values, plus `NEXT_PUBLIC_FIREBASE_APPCHECK_KEY` for production.

**They are inlined at BUILD time, not read at run time.** `NEXT_PUBLIC_*` variables
are baked into the JavaScript bundle when `next build` runs. Adding or changing one
therefore does nothing to the site already deployed — **you must redeploy**, not just
restart. A variable that is set correctly in the dashboard and absent from the bundle
is the most confusing version of this bug, and the form will simply say it is not
connected.

To confirm which values actually shipped, load the deployed `/join` and submit: if it
says "not connected to anything yet", the build did not have them.

Also add your production domain under **Firebase console → Authentication → Settings →
Authorized domains** if you later add any Firebase Auth. Firestore writes do not need
it; App Check's reCAPTCHA does — register the domain in the **App Check** section.

---

## Testing it without a Firebase project

You can run the entire form — real submit, real rules, a real database you can browse —
with **no Firebase project and no credentials**, using the emulator. Do this before
touching production. It is also the only honest way to test a change to
`firestore.rules`.

Needs Java (the emulator is a JAR) and nothing else.

```bash
# terminal 1 — from the repo root
npx firebase-tools emulators:start --only firestore --project demo-osc

# terminal 2 — point the site at it
cd web
cat > .env.local <<'ENV'
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-osc
NEXT_PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:8080
ENV
npm run dev
```

Submit the form at `/join`, then open **<http://127.0.0.1:4000/firestore>** and you
will see the document. Rules are enforced exactly as in production, so a submission
that the emulator accepts is one production will accept.

The `demo-` project prefix is what makes this safe: the SDK refuses to reach real
Google services for it, so there is no way to accidentally write into the organisers'
actual collection.

Delete `.env.local` when you are done, or the form will keep pointing at an emulator
that is no longer running.

### Testing the rules directly

```bash
npm run rules:emulator      # with the emulator running
```

Eighteen assertions: that a genuine application is accepted, that optional fields are
genuinely optional, and that reads, updates, deletes, writes to other collections,
out-of-set values, extra fields, malformed emails, oversized fields, missing required
fields and a client-forged timestamp are all refused.

Run it whenever you touch `firestore.rules` or the form's fields. `npm run rules` is
the cheap text check that runs in CI; this one actually executes the rules, which is
the difference between "the file says `allow read: if false`" and "a read was attempted
and refused".

> **A trap worth knowing.** If you query the emulator over its REST API to check your
> data, an unauthenticated read returns an **empty list rather than an error**, because
> `allow read: if false` denies it. That looks exactly like "my write silently failed".
> Add the emulator's admin bypass:
>
> ```bash
> curl -s -H "Authorization: Bearer owner" \
>   "http://127.0.0.1:8080/v1/projects/demo-osc/databases/(default)/documents/applications"
> ```
>
> Or just use the emulator UI, which is already privileged.

---

## Reading submissions

**Firestore → Data → `applications`.** Access is governed by who has permissions on
the Firebase project, not by the rules in this repo — so adding an organiser means
adding their Google account under **Project settings → Users and permissions**, and
removing one means removing it there.

There is deliberately no admin page on the site. Building one means giving a client
`read` on this collection, which is the one thing the rules exist to prevent. If you
need one later, it needs a real server with authentication, and it is a much larger
change than it looks.

### The document shape

```js
{
  name:         "Asha Verma",             // required
  email:        "asha@example.com",       // required, format-checked
  year_branch:  "2nd year, CSE",          // required
  level:        "none",                   // required, closed set
  path:         "build-day",              // required, closed set
  why:          "…",                      // required, ≤400 chars
  interests:    ["web", "ml"],            // optional, ≤5, closed set
  github:       "octocat",                // optional, omitted if blank
  heard_from:   "senior",                 // optional, omitted if blank
  updates:      false,                    // optional bool
  submitted_at: <server timestamp>        // set by Firestore, not the client
}
```

`submitted_at` uses `request.time` and is enforced by the rules, so submission order
cannot be forged even though every other field comes from the browser. Optional fields
are **omitted rather than stored empty**, so `github` being absent means "not given".

---

## Changing the form

**`firestore.rules` hardcodes the allowed values for `level`, `path` and `interests`,
because Firestore rules cannot import anything.** They are a second copy of the lists
in `web/content/join.ts`.

If you add a path, a level or an interest, **you must update both files.** Otherwise
every applicant who picks the new option gets a permission error on submit — the form
looks perfect, the page renders correctly, and only that one option is broken.

This is not hypothetical: two of the five values were wrong when this was first
written (`some` for `some-git`, `hackathon` for `build-day`). So there is a check:

```bash
cd web && npm run rules
```

It diffs the two files and asserts the create-only boundary is still closed. It runs
in CI, needs no Firebase project and no network. Nothing else in the repo would catch
this drift — the smoke test submits no applications and the QA sweep reads pixels.

**If you widen the rules, this check is also what fails when someone denies `read` no
longer.** That is intentional.

---

## Adding another form

The rules close **every** path except `applications`, so a second form does not
half-work — it is denied outright with `Missing or insufficient permissions`. That is
deliberate: a new collection inheriting write access by accident is how a project gets
an open document store.

To add one — say a mentor nomination form:

**1. Add a validated block to `firestore.rules`.** Copy the `applications` block and
its validator; do not widen the existing one. The four lines that must survive the copy:

```
allow read: if false;              // nobody reads through a client
allow update, delete: if false;    // immutable once submitted
allow create: if isWellFormedNomination(request.resource.data);
```

Keep `hasOnly` on the field list, keep the length limits, and keep
`submitted_at == request.time`. Without `hasOnly` a submitter can append arbitrary
keys; without the limits, one request can write a megabyte.

**2. Name the collection in one place.** Add it beside `APPLICATIONS` in
`web/lib/firebase.ts` and import it. The client and the rules referring to different
strings is a permission error that looks nothing like a typo.

**3. Deploy the rules before shipping the form.** In that order, or the first real
submission fails.

**4. Extend `web/scripts/rules.mjs`.** It currently checks one collection. If the new
form has closed-set options in `web/content/`, add them to the drift check — the whole
reason it exists is that Firestore rules cannot import, so every new duplicated list
is a new thing that can silently disagree.

**5. Tell people what happens to their data,** in the form, next to the submit button.
The join form carries two sentences saying answers go to the organisers and nothing is
published. A form that quietly starts storing personal details is the behaviour this
site criticises elsewhere.

**What not to do:** do not reuse `applications` for a different kind of submission. The
validator pins an exact field set, so a nomination would be rejected by it — and
loosening the validator to accept both shapes means neither is really validated.

---

## Troubleshooting

| What you see | What it means |
|---|---|
| "This form is not connected to anything yet" | No config. One of the six `NEXT_PUBLIC_FIREBASE_*` values is missing or empty. Restart the dev server — env changes are not hot-reloaded. |
| Console: `Missing or insufficient permissions` | The rules rejected the write. Either they are not deployed (step 4), or the document failed validation — most likely a `level`/`path`/`interests` value the rules do not know. Run `npm run rules`. |
| Button stuck on "Sending…", then a "could not confirm" message after 12s | The SDK could not reach Firestore. Wrong `projectId`, no database created, or offline. `addDoc` does **not** reject when the backend is unreachable — it queues and retries forever — which is why there is a timeout at all. |
| Console: `Refused to connect … Content Security Policy` | The CSP in `web/next.config.js` is missing an origin. It already allows `firestore.googleapis.com`, `*.googleapis.com`, and reCAPTCHA on `google.com`/`gstatic.com`. **This fails silently in every screenshot** — the page renders perfectly and only the submit is dead. |
| Works locally, fails in production | Env vars are not set on the host, or App Check enforcement is on without a site key configured there. |
| Nothing appears in the console's Data tab | Check you are looking at the right project and the `applications` collection. A write to a different collection name is denied by the catch-all, so it would have errored. |

---

## Do not

- **Loosen `allow read`.** It is `if false` and stated explicitly so that anyone
  opening it up has to delete a line that says `false`, rather than add one that was
  never there. A world-readable `applications` collection publishes every applicant's
  name, email and college.
- **Put a service account key, admin credential, or any secret in `.env.local`,
  `.env.example`, or a `NEXT_PUBLIC_` variable.** They ship to the browser.
- **Commit `.env.local`.** It is gitignored; keep it that way.
- **Add a `hosting` block to `firebase.json`.** The site deploys elsewhere; a second
  target competing with it is a bad afternoon.
- **Run `npm run build` while `npm run dev` is running.** Unrelated to Firebase but it
  will cost you an hour: they share `web/.next`, so the page keeps returning 200 while
  no JavaScript loads. Recover with `rm -rf web/.next`, restart, and confirm with
  `npm run smoke`.
