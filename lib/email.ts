import { Resend } from "resend";
import { createServiceClient } from "./supabase";

export type EmailKind = "personal_link" | "reminder" | "cron";

/**
 * Record an email attempt, or a cron decision not to send one.
 *
 * Never throws: logging must not be able to break a send, and the table may
 * not exist yet on a database that hasn't had the migration run.
 */
export async function logEmail(entry: {
  kind: EmailKind;
  memberId?: string | null;
  to?: string | null;
  subject?: string | null;
  ok: boolean;
  resendId?: string | null;
  detail?: string | null;
}) {
  try {
    await createServiceClient().from("email_log").insert({
      kind: entry.kind,
      member_id: entry.memberId ?? null,
      to_email: entry.to ?? null,
      subject: entry.subject ?? null,
      ok: entry.ok,
      resend_id: entry.resendId ?? null,
      detail: entry.detail ?? null,
    });
  } catch (err) {
    console.error("[email_log] could not write:", err);
  }
}

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
async function send(
  kind: EmailKind,
  memberId: string | null,
  to: string,
  subject: string,
  text: string
) {
  const resend = client();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY unset; would have emailed ${to}: ${subject}`);
    await logEmail({ kind, memberId, to, subject, ok: false, detail: "RESEND_API_KEY unset (dev)" });
    return false;
  }
  // The Resend SDK resolves with { data, error } and does NOT throw on API errors —
  // a rejected send looks exactly like a successful one unless you inspect `error`.
  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to,
    subject,
    text,
  });

  if (error) {
    console.error(
      `[email] Resend rejected the send to ${to}: ${error.name} — ${error.message}`
    );
    await logEmail({ kind, memberId, to, subject, ok: false, detail: `${error.name}: ${error.message}` });
    return false;
  }

  console.log(`[email] sent to ${to} (id ${data?.id})`);
  await logEmail({ kind, memberId, to, subject, ok: true, resendId: data?.id ?? null });
  return true;
}

export async function sendPersonalLink(
  to: string,
  name: string,
  token: string,
  memberId: string | null = null
) {
  return send(
    "personal_link",
    memberId,
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
  kickoff: Date,
  memberId: string | null = null
) {
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(kickoff);

  return send(
    "reminder",
    memberId,
    to,
    `${missing} pick${missing === 1 ? "" : "s"} still to make`,
    `Hi ${name},

You've got ${missing} game${missing === 1 ? "" : "s"} left to pick this week.
First kickoff is ${when}.

${joinUrl(token)}

Takes about a minute.`
  );
}
