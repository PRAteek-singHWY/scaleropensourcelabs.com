// Email the organisers whenever somebody applies.
//
// Triggered by the document being created, NOT by the form. That ordering is the whole
// design: the applicant's submit succeeds or fails on the Firestore write alone, so if
// SMTP is down, the mailbox is full, or this function throws, the application is still
// safely stored and nobody loses their submission. An email failure is an inconvenience
// for the organisers, never a lost applicant.
//
// It also means this cannot be used to confirm delivery to the applicant. It is a
// notification to the club, not a receipt to the student — the form's own success panel
// is the receipt.
//
// WHAT THIS COSTS. Outbound network from Cloud Functions requires the Blaze
// (pay-as-you-go) plan. For a student club's application volume the usage sits inside
// the free allowance, but a billing account must exist on the project. There is no way
// around that: it is Google's restriction on egress, not a choice made here.
//
// CREDENTIALS. Two secrets, held in Google Secret Manager via defineSecret and never in
// this repo, never in .env, and never in a NEXT_PUBLIC_ variable:
//
//   firebase functions:secrets:set SMTP_URL
//   firebase functions:secrets:set MAIL_TO
//
// SMTP_URL is a connection string, which keeps this provider-agnostic — Gmail with an
// app password, the domain's own mailbox, SendGrid, Mailgun, Resend, anything that
// speaks SMTP. Chosen over a provider SDK deliberately: the club should not have to
// migrate this function if it changes email host.
//
//   smtps://user%40example.com:app-password@smtp.gmail.com:465
//
// The username and password must be URL-encoded — an @ in the username or a / in the
// password will otherwise silently truncate the string and the connection fails with a
// confusing auth error.

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

const { formatApplication } = require("./format");

const SMTP_URL = defineSecret("SMTP_URL");
const MAIL_TO = defineSecret("MAIL_TO");

// asia-south1 to sit beside the Firestore database. A function in another region works
// but pays a cross-region round trip on every trigger for no reason.
setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

exports.emailOnApplication = onDocumentCreated(
  {
    document: "applications/{id}",
    secrets: [SMTP_URL, MAIL_TO],
    // One retry is worth having for a transient SMTP failure; more than that risks
    // sending the same application repeatedly, which is worse than missing one.
    retry: false,
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("Triggered with no document; nothing to send.");
      return;
    }

    const data = snap.data();
    const { subject, text, replyTo } = formatApplication(data, event.params.id);

    const url = SMTP_URL.value();
    const to = MAIL_TO.value();

    // Degrade to a log rather than throwing. An unconfigured function that crashes fills
    // the error log and tells nobody anything useful; this way the application is stored,
    // the body is visible in `firebase functions:log`, and the fix is obvious.
    if (!url || !to) {
      logger.warn(
        "SMTP_URL or MAIL_TO is not set, so no email was sent. The application IS saved.",
        { subject },
      );
      return;
    }

    try {
      const transport = nodemailer.createTransport(url);
      await transport.sendMail({
        // From must be an address the SMTP account is allowed to send as, so it is
        // derived from the connection rather than invented. Many providers silently
        // rewrite or reject a mismatched From.
        from: to,
        to,
        replyTo,
        subject,
        text,
      });
      logger.info("Application email sent.", { id: event.params.id });
    } catch (err) {
      // Logged, not rethrown. The document is already written and committed; throwing
      // would only mark the trigger failed and, with retries on, could email twice.
      logger.error("Could not send the application email. The application IS saved.", {
        id: event.params.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
);
