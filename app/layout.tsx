import type { Metadata, Viewport } from "next";
import { Zilla_Slab, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const display = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gilson Family Football Pool",
  description: "Pick winners, track wins, talk trash.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf6ef", // light-only palette; see the note in globals.css
};

/**
 * Which database this render is talking to.
 *
 * The banner is deliberately loud. Local development points at a local
 * Supabase stack, but nothing stops a stray env var from aiming a dev server
 * at the family's real pool — and a mis-tap there changes somebody's actual
 * pick. Better to always be able to see which one you're on.
 */
function dbEnvironment(): "local" | "remote" | "unset" {
  const url = process.env.SUPABASE_URL;
  if (!url) return "unset";
  return /127\.0\.0\.1|localhost/.test(url) ? "local" : "remote";
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = dbEnvironment();
  const isProdHost = process.env.SITE_URL?.includes("pool.themullins.org");
  // Only shout when the pairing is surprising: the live site on the live
  // database is the one combination that needs no warning.
  const banner =
    env === "unset"
      ? { text: "No database configured", tone: "#c0392b" }
      : env === "local"
        ? { text: "Local database — safe to click", tone: "#256a3a" }
        : isProdHost
          ? null
          : { text: "Live database — your picks are real", tone: "#c0392b" };

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {banner && (
          <p
            role="status"
            style={{
              margin: 0,
              padding: "4px 10px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "#fff",
              background: banner.tone,
            }}
          >
            {banner.text}
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
