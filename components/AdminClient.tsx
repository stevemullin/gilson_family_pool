"use client";

import { useState } from "react";

interface Props {
  adminName: string;
  week: number;
  members: Array<{ id: string; name: string; email: string }>;
  games: Array<{ id: string; label: string; away: string; home: string }>;
  pickCounts: Record<string, number>;
  lastSync: string | null;
}

export default function AdminClient(props: Props) {
  const [message, setMessage] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [overrideMember, setOverrideMember] = useState("");
  const [overrideGame, setOverrideGame] = useState("");
  const [overrideTeam, setOverrideTeam] = useState("");

  const total = props.games.length;
  const game = props.games.find((g) => g.id === overrideGame);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail }),
    });
    const body = await res.json();
    if (!res.ok) return setMessage(body.message ?? "Couldn't add that member.");
    setMessage(
      body.emailed
        ? `Added ${body.name} and emailed their link.`
        : `Added ${body.name}. Email isn't configured — send them this: ${body.link}`
    );
    setNewName("");
    setNewEmail("");
  }

  async function resend(id: string, name: string) {
    const res = await fetch(`/api/members/${id}/resend`, { method: "POST" });
    const body = await res.json();
    setMessage(
      body.emailed ? `Re-sent ${name}'s link.` : `Send ${name} this: ${body.link}`
    );
  }

  async function forceRefresh() {
    setMessage("Refreshing…");
    const res = await fetch("/api/scores/refresh", { method: "POST" });
    const body = await res.json();
    setMessage(
      res.ok ? `Synced ${body.games} games for week ${body.week}.` : body.message
    );
  }

  async function saveOverride() {
    const res = await fetch("/api/admin/pick", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: overrideMember,
        gameId: overrideGame,
        team: overrideTeam,
      }),
    });
    const body = await res.json();
    setMessage(res.ok ? "Override saved." : body.message);
  }

  return (
    <main className="mx-auto max-w-[1000px] px-5 pb-16 pt-6">
      <p className="overline">Gilson Family Football Pool</p>
      <h1 className="display mt-1 text-[26px] font-bold">Commissioner tools</h1>
      <p className="mt-1 text-[12px]" style={{ color: "var(--ink-secondary)" }}>
        Signed in as {props.adminName} · Week {props.week}
      </p>

      {message && (
        <p
          className="mt-3 rounded-[12px] px-3 py-2 text-[12px]"
          style={{ background: "var(--desk)", color: "var(--ink)" }}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <section style={cardStyle}>
          <h2 className="display text-[16px] font-bold">Members</h2>
          <table className="mt-3 w-full text-[12px]">
            <thead>
              <tr style={{ color: "var(--ink-tertiary)" }}>
                <th className="py-1 text-left font-normal">Name</th>
                <th className="py-1 text-left font-normal">Email</th>
                <th className="py-1 text-center font-normal">Week picks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {props.members.map((m) => {
                const made = props.pickCounts[m.id] ?? 0;
                const complete = total > 0 && made >= total;
                return (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                    <td className="py-2 font-bold">{m.name}</td>
                    <td className="py-2" style={{ color: "var(--ink-secondary)" }}>
                      {m.email}
                    </td>
                    <td
                      className="display py-2 text-center font-bold"
                      style={{
                        color: complete ? "var(--correct-ink)" : "var(--wrong-ink)",
                      }}
                    >
                      {made}/{total}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => resend(m.id, m.name)}
                        className="rounded-[10px] px-2 py-1 text-[11px] font-bold"
                        style={{
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                        }}
                      >
                        Resend link
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <form onSubmit={addMember} className="mt-4 flex flex-wrap gap-2">
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              style={inputStyle}
              className="flex-1 rounded-[10px] px-3 py-2 text-[13px]"
            />
            <input
              required
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              style={inputStyle}
              className="flex-1 rounded-[10px] px-3 py-2 text-[13px]"
            />
            <button
              type="submit"
              className="rounded-[10px] px-3 py-2 text-[13px] font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              + Add member
            </button>
          </form>
        </section>

        <div className="flex flex-col gap-4">
          <section style={cardStyle}>
            <h2 className="display text-[16px] font-bold">Scores</h2>
            <p className="mt-2 text-[12px]" style={{ color: "var(--ink-secondary)" }}>
              Auto-refreshes every 60s on game days. Last sync:{" "}
              {props.lastSync
                ? new Date(props.lastSync).toLocaleString("en-US", {
                    timeZone: "America/New_York",
                  })
                : "never"}
              .
            </p>
            <button
              onClick={forceRefresh}
              className="mt-3 rounded-[10px] px-3 py-2 text-[13px] font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Force refresh now
            </button>
          </section>

          <section style={cardStyle}>
            <h2 className="display text-[16px] font-bold">Override a pick</h2>
            <select
              value={overrideMember}
              onChange={(e) => setOverrideMember(e.target.value)}
              style={inputStyle}
              className="mt-2 w-full rounded-[10px] px-3 py-2 text-[13px]"
            >
              <option value="">Choose a member…</option>
              {props.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              value={overrideGame}
              onChange={(e) => {
                setOverrideGame(e.target.value);
                setOverrideTeam("");
              }}
              style={inputStyle}
              className="mt-2 w-full rounded-[10px] px-3 py-2 text-[13px]"
            >
              <option value="">Choose a game…</option>
              {props.games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>

            {game && (
              <div className="mt-2 flex gap-2">
                {[game.away, game.home].map((abbr) => (
                  <button
                    key={abbr}
                    onClick={() => setOverrideTeam(abbr)}
                    className="display flex-1 rounded-[10px] px-3 py-2 text-[14px] font-bold"
                    style={{
                      border: `2px solid ${
                        overrideTeam === abbr ? "var(--accent)" : "var(--card-border)"
                      }`,
                      color: "var(--ink)",
                    }}
                  >
                    {abbr}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={saveOverride}
              disabled={!overrideMember || !overrideGame || !overrideTeam}
              className="mt-3 w-full rounded-[10px] px-3 py-2 text-[13px] font-bold disabled:opacity-50"
              style={{ background: "var(--desk)", color: "var(--ink)" }}
            >
              Save override
            </button>
            <p className="mt-2 text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
              For &ldquo;my phone died before kickoff&rdquo; emergencies. Logged and
              visible to everyone.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: "var(--radius-card)",
  padding: "16px",
};

const inputStyle: React.CSSProperties = {
  border: "1.5px solid #ddd2bc",
  background: "var(--card)",
  color: "var(--ink)",
};
