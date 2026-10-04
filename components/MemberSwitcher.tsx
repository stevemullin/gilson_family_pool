import Link from "next/link";
import type { Session } from "@/lib/auth";

/**
 * Lets a parent pick for their kids without logging out and back in.
 *
 * Shown only to accounts that actually manage someone. The acting-as bar is
 * deliberately loud: the dangerous mistake isn't failing to switch, it's
 * filling in sixteen games without noticing you're still somebody else.
 */
export default function MemberSwitcher({
  session,
  returnTo,
}: {
  session: Session;
  returnTo: string;
}) {
  if (session.manages.length === 0) return null;

  const people = [
    { id: session.account.id, name: session.account.name, self: true },
    ...session.manages.map((m) => ({ ...m, self: false })),
  ];
  const acting = session.viewer.id !== session.account.id;
  const next = encodeURIComponent(returnTo);

  return (
    <div className="mt-3">
      {acting && (
        <p
          className="mb-2 rounded-[10px] px-3 py-[6px] text-center text-[12px] font-bold text-white"
          style={{ background: "var(--accent)" }}
          role="status"
        >
          Picking as {session.viewer.name}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-[6px]">
        {people.map((p) => {
          const current = p.id === session.viewer.id;
          return (
            <Link
              key={p.id}
              href={`/act/${p.id}?next=${next}`}
              aria-current={current ? "true" : undefined}
              className="rounded-full px-[10px] py-[4px] text-[11px] font-bold"
              style={
                current
                  ? { background: "var(--accent)", color: "#fff" }
                  : {
                      background: "var(--card)",
                      color: "var(--ink-secondary)",
                      boxShadow: "inset 0 0 0 1px var(--card-border)",
                    }
              }
            >
              {p.self ? "Me" : p.name.split(" ")[0]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
