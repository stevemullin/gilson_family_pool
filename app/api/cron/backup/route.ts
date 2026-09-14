import { NextResponse } from "next/server";
import { takeBackup, gzipBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Hands back the whole database as one gzipped JSON document.
 *
 * The free tier keeps no backups, so the commissioner's Mac pulls one from
 * here every night into a folder that's already synced to the cloud
 * (backups/pull-backup.sh + launchd). Nothing is stored server-side and no
 * email is involved; this endpoint just serialises and returns.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const backup = await takeBackup();
  const gz = gzipBackup(backup);
  const filename = `pool-backup-${backup.taken_at.slice(0, 10)}.json.gz`;

  return new NextResponse(new Uint8Array(gz), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(gz.length),
      "Cache-Control": "no-store",
      "X-Backup-Counts": Object.entries(backup.counts)
        .map(([t, n]) => `${t}=${n}`)
        .join(","),
    },
  });
}
