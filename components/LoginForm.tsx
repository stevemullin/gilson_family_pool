"use client";

import { useState } from "react";

export default function LoginForm({ invalid }: { invalid?: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-6 text-center">
      <span
        className="display flex h-[52px] w-[52px] items-center justify-center rounded-full text-[24px] font-bold text-white"
        style={{ background: "var(--accent)" }}
        aria-hidden
      >
        G
      </span>

      <h1 className="display mt-4 text-[24px] font-bold leading-tight">
        Gilson Family
        <br />
        Football Pool
      </h1>

      {invalid && !sent && (
        <p
          className="mt-4 rounded-[12px] px-3 py-2 text-[12px] font-bold"
          style={{ background: "var(--wrong-bg)", color: "var(--wrong-ink)" }}
          role="alert"
        >
          That link isn&rsquo;t valid any more. Enter your email and we&rsquo;ll send a
          fresh one.
        </p>
      )}

      {sent ? (
        <p className="mt-4 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
          If that address is in the pool, your link is on its way. Check your email —
          open the link once and you&rsquo;re set for the season.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            No passwords here. You get a personal link that keeps you signed in all
            season — we&rsquo;ll send it again if you&rsquo;ve lost it.
          </p>

          <form onSubmit={submit} className="mt-5 w-full">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[12px] px-4 py-3 text-center text-[15px] outline-none"
              style={{
                border: "1.5px solid #ddd2bc",
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-[12px] px-4 py-3 text-[15px] font-bold text-white disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {busy ? "Sending…" : "Email me my link"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
        Only emails already in the pool get a link. Ask the commissioner if yours changed.
      </p>
    </main>
  );
}
