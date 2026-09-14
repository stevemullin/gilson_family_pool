import { gzipSync } from "zlib";
import { createServiceClient } from "./supabase";

export const BACKUP_TABLES = ["members", "games", "picks", "sync_state", "email_log"] as const;

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

  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    tables[table] = data ?? [];
    counts[table] = tables[table].length;
  }

  return { taken_at: new Date().toISOString(), counts, tables };
}

export function gzipBackup(backup: Backup): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(backup)));
}
