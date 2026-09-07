"use client";

import { useEffect, useRef, useState } from "react";

export default function LoginForm({ invalid }: { invalid?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Password managers and iOS Keychain can fill the field before React has
  // hydrated, which leaves the controlled state empty. Pick that value up once
  // on mount so the first render doesn't wipe it.
  useEffect(() => {
    const filled = inputRef.current?.value;
    if (filled) setEmail(filled);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Read the field itself, so an autofill that skipped React's change event
    // still submits the address the user can see.
    const value = (inputRef.current?.value ?? email).trim();
    setBusy(true);
    await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
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
          Your link is on its way. Check your email and open it — that&rsquo;s the whole
          sign-in.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            No passwords. Put your name and email in and we&rsquo;ll send you a personal
            link — open it once and you&rsquo;re signed in for the season. First time and
            fiftieth, same two boxes.
          </p>

          {error && (
            <p
              className="mt-4 w-full rounded-[12px] px-3 py-2 text-[12px] font-bold"
              style={{ background: "var(--wrong-bg)", color: "var(--wrong-ink)" }}
              role="alert"
            >
              {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-5 w-full">
            <input
              type="text"
              name="name"
              id="name"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mb-3 w-full rounded-[12px] px-4 py-3 text-center text-[15px] outline-none"
              style={{
                border: "1.5px solid #ddd2bc",
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            {/* type="text" rather than "email": iOS turns off autocorrect for
                email inputs, and text-replacement shortcuts ride on autocorrect.
                inputMode keeps the @ key on the keyboard, and the pattern plus
                the server's own check cover validation. The pattern tolerates
                surrounding whitespace because expanding a text-replacement
                shortcut leaves the trailing space that triggered it; submit
                trims before sending. */}
            <input
              ref={inputRef}
              type="text"
              id="email"
              name="email"
              required
              pattern="\s*[^@\s]+@[^@\s]+\.[^@\s]+\s*"
              title="Enter an email address, like you@example.com"
              inputMode="email"
              autoComplete="email"
              autoCorrect="on"
              autoCapitalize="none"
              enterKeyHint="send"
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
        Anyone in the family can join — if nothing arrives, check your spam folder.
      </p>
    </main>
  );
}
