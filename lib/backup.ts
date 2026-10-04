import { gzipSync } from "zlib";
import { createServiceClient } from "./supabase";

export const BACKUP_TABLES = ["members", "games", "picks", "sync_state", "email_log", "guardianships"] as const;

export interface Backup {
  taken_at: string;
  counts: Record<(typeof BACKUP_TABLES)[number], number>;
  tables: Record<(typeof BACKUP_TABLES)[number], unknown[]>;
}

/**
 * Every row of every table, as one JSON document.
 *
 * The free tier keeps no backups of its own, and one bad morning in
 * September showed what that means: an API blip made the pool look wiped and
 * there was nothing to restore from. Pulled nightly by backups/pull-backup.sh;
 * restored by backups/restore.py, which turns this document into upsert SQL
 * for the Supabase editor.
 */
export async function takeBackup(): Promise<Backup> {
  const supabase = createServiceClient();
  const tables = {} as Backup["tables"];
  const counts = {} as Backup["counts"];

  // Paged for the same reason loadSeasonData is: an unbounded select stops at
  // 1000 rows, so a backup of a larger table would silently be a partial one.
  for (const table of BACKUP_TABLES) {
    const PAGE = 1000;
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order(table === "guardianships" ? "guardian_id" : "id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if ((data ?? []).length < PAGE) break;
    }
    tables[table] = rows;
    counts[table] = rows.length;
  }

  return { taken_at: new Date().toISOString(), counts, tables };
}

export function gzipBackup(backup: Backup): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(backup)));
}
