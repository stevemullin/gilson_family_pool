import { Resend } from "resend";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function joinUrl(token: string) {
  return `${process.env.SITE_URL}/join/${token}`;
}

/**
 * Sends, or no-ops when Resend isn't configured yet. The app is fully usable before
 * the domain verifies — links can be handed out by text (SPEC.md §8).
 */
async function send(to: string, subject: string, text: string) {
  const resend = client();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY unset; would have emailed ${to}: ${subject}`);
    return false;
  }
  await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to,
    subject,
    text,
  });
  return true;
}

export async function sendPersonalLink(
  to: string,
  name: string,
  token: string
) {
  return send(
    to,
    "Your Gilson Family Football Pool link",
    `Hi ${name},

Here's your personal link to the pool:

${joinUrl(token)}

Open it once and you'll stay signed in all season — no password, nothing to remember.
Bookmark it on your phone. If you ever lose it, you can have it re-sent to yourself.

Good luck.`
  );
}

export async function sendReminder(
  to: string,
  name: string,
  token: string,
  missing: number,
  kickoff: Date
) {
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(kickoff);

  return send(
    to,
    `${missing} pick${missing === 1 ? "" : "s"} still to make`,
    `Hi ${name},

You've got ${missing} game${missing === 1 ? "" : "s"} left to pick this week.
First kickoff is ${when}.

${joinUrl(token)}

Takes about a minute.`
  );
}
