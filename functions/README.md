# functions/ — not deployed, on purpose

This directory contains one Cloud Function that would email the organisers whenever
somebody applies. **It is deliberately not in use.** Applications are read in the
Firebase console instead.

## Why it is switched off

Cloud Functions cannot make outbound network calls on Firebase's free **Spark** plan,
and sending email is an outbound call. So this function requires the **Blaze**
(pay-as-you-go) plan, which requires a card on file — even though a student club's
volume sits inside the free allowance and the bill would in practice be zero.

The club chose to stay on the free plan and read submissions in the console. That loses
nothing: every field of every application is stored and visible there.

## It cannot fire by accident

`firebase.json` does **not** declare a `functions` block, so `firebase deploy` ignores
this directory entirely. Nothing here runs, costs anything, or affects the site. The
form does not depend on it — the email was always downstream of the Firestore write, so
an applicant's submission succeeds whether or not any of this exists.

## If you do want email later

1. Upgrade the project to Blaze in the Firebase console.
2. Add a `functions` block to `firebase.json`:
   ```json
   "functions": { "source": "functions" }
   ```
3. Set the two secrets — they go to Google Secret Manager, never into this repo:
   ```bash
   firebase functions:secrets:set SMTP_URL    # e.g. smtps://user%40gmail.com:app-password@smtp.gmail.com:465
   firebase functions:secrets:set MAIL_TO     # where notifications land
   ```
   URL-encode the username and password. An `@` in the username or a `/` in the
   password will otherwise truncate the connection string and fail with a confusing
   auth error.
4. `cd functions && npm install && cd .. && firebase deploy --only functions`

`SMTP_URL` is a connection string rather than a vendor SDK, so Gmail with an app
password, the domain's own mailbox, SendGrid, Mailgun and Resend all work without
changing the code.

## Testing it without any of that

```bash
cd functions && npm test
```

20 assertions against the formatter — the part with all the logic and the only part an
organiser sees. Needs no Firebase, no billing, no SMTP and no deploy. It prints a sample
email at the end so you can read what an organiser would receive.
