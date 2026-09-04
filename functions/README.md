# functions/

Three Cloud Functions, in two unrelated jobs. **One of them is dormant and two are
live** — which half you care about depends on why you opened this directory.

| Function | Status | What it does |
|---|---|---|
| `emailOnApplication` | **dormant** | emails the organisers when a row lands in `applications` |
| `syncContributions` | live | 04:00 IST daily, fetches members' GitHub pull requests |
| `refreshContributions` | live | the same fetch for one member, from the dashboard button |

All three need the **Blaze** (pay-as-you-go) plan, because all three make outbound
network calls and Firebase's free **Spark** plan does not allow those. A student club's
volume sits well inside the free allowance and the bill is in practice zero, but a
billing account has to exist on the project. That is Google's restriction on egress, not
a choice made here.

> **This directory used to say it could not fire by accident**, because `firebase.json`
> declared no `functions` block and `firebase deploy` therefore ignored it. That is no
> longer true — the block was added so the contribution sync could deploy. Everything
> here now deploys when you run `firebase deploy`, including the dormant one.

---

## The GitHub sync (live)

This is what fills the "Your open source" panel on `/dashboard`.

### Why it is a function and not a fetch in the browser

Two reasons, and each one alone would be enough:

* **Rate limits.** An unauthenticated browser gets 60 GitHub requests an hour *per IP*,
  which on a college network is 60 an hour for the entire club.
* **Trust.** A count the client writes is a count the client can invent. "Merged pull
  requests" is the one number on that dashboard somebody has a reason to inflate, so
  `contributions/{uid}` is `allow write: if false` for **every** client including its
  owner, and only the Admin SDK — which bypasses the rules — writes it.

### Setting it up

```bash
firebase functions:secrets:set GITHUB_TOKEN   # a token with NO scopes at all
firebase deploy --only functions
```

The token is **optional but not really**. It only ever reads public data, so no scopes
are needed — it exists purely for the rate limit. Without it GitHub allows 10 searches a
minute and 60 user lookups an *hour*, so the nightly sweep stops after about fifteen
members, and the failure arrives as a 403 that reads like a permissions problem. With it:
30 a minute and 5,000 an hour.

### What it costs to run

The sweep spends **two search requests and one user lookup per member**, paced one member
every five seconds, and stops at the 100 stalest rows per run. So a club of 100 is
refreshed daily and a club of 400 every four days, in a deterministic order — and the
dashboard's "checked N days ago" line is what makes that visible rather than mysterious.
If it ever needs to go faster, the cap and the gap are both named constants at the top of
`index.js`.

The callable is rate-limited to one refresh per member per ten minutes, enforced in the
function rather than in the client, because a client-side timer is a suggestion.

---

## The application email (dormant)

It triggers on `applications/{id}`, which is the **legacy** collection from before
sign-in existed. Nothing writes there any more — the profile at `users/{uid}` replaced
it — so this function never fires today.

It is kept rather than deleted because pointing it at `users/{uid}` is a decision about
whether organisers want an email per sign-up, not a tidy-up. If you make that decision,
change the `document` option in `index.js` and check `format.js` still matches the
profile's field list, which has lost four fields since this was written.

To switch it on you also need its two secrets, which go to Google Secret Manager and
never into this repo:

```bash
firebase functions:secrets:set SMTP_URL    # e.g. smtps://user%40gmail.com:app-password@smtp.gmail.com:465
firebase functions:secrets:set MAIL_TO     # where notifications land
```

URL-encode the username and password. An `@` in the username or a `/` in the password
will otherwise truncate the connection string and fail with a confusing auth error.

`SMTP_URL` is a connection string rather than a vendor SDK, so Gmail with an app
password, the domain's own mailbox, SendGrid, Mailgun and Resend all work without
changing the code.

---

## Testing, without Firebase, billing, a token or a deploy

```bash
cd functions && npm test
```

Two suites, both pure:

* **`test-format.mjs`** — 20 assertions against the email formatter, the part with all
  the logic and the only part an organiser ever sees. It prints a sample email at the
  end so you can read what would arrive.
* **`test-github.mjs`** — 33 assertions against `github.js`, driven by recorded GitHub
  payloads with `fetch` stubbed out. The cases worth knowing about are the ones that are
  easy to get wrong and impossible to notice: a real account with no pull requests versus
  a handle that does not exist (they look almost identical from the API and the dashboard
  has to word them completely differently), the distinct-repository count (derived, not
  returned — an earlier version counted only the eight rows the dashboard lists and
  produced a number that looked entirely plausible), and that a rate limit **throws**
  rather than resolving to zeroes, because a silent zero would overwrite a real member's
  real counts.

The rules that protect what these functions write are exercised separately, against the
real emulator, by `web/scripts/rules-emulator.mjs`.
