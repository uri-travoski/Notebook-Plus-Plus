// Backup/restore run log, stored in the backup_history table (newest first).
import { desc } from 'drizzle-orm'
import { useDb, schema } from '../../db'

export type HistoryEntry = {
  type: 'backup' | 'restore'
  ok: boolean
  name?: string | null
  size?: number | null
  location?: string | null
  includesUploads?: boolean | null
  error?: string | null
  durationMs?: number | null
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await useDb()
    .insert(schema.backupHistory)
    .values({
      type: entry.type,
      ok: entry.ok,
      name: entry.name ?? null,
      size: entry.size ?? null,
      location: entry.location ?? null,
      includesUploads: entry.includesUploads ?? null,
      error: entry.error ? entry.error.slice(0, 1000) : null,
      durationMs: entry.durationMs ?? null,
    })
}

export async function readHistory(limit = 50) {
  return useDb()
    .select()
    .from(schema.backupHistory)
    .orderBy(desc(schema.backupHistory.createdAt))
    .limit(limit)
}
