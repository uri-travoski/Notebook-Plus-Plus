import { PgBoss } from 'pg-boss'

// Single pg-boss instance for the app (jobs — no Redis). Started by server/plugins/boss.ts.
export const EXPORT_QUEUE = 'export-markdown'
export const BACKUP_QUEUE = 'backup'

let boss: PgBoss | null = null

export async function startBoss(): Promise<PgBoss | null> {
  if (boss) return boss
  const url = useRuntimeConfig().databaseUrl || process.env.NUXT_DATABASE_URL
  if (!url) return null
  boss = new PgBoss(url)
  boss.on('error', (e) => console.error('[pg-boss]', e))
  await boss.start()
  await boss.createQueue(EXPORT_QUEUE)
  await boss.createQueue(BACKUP_QUEUE)
  return boss
}

export function useBoss(): PgBoss {
  if (!boss) throw createError({ statusCode: 503, statusMessage: 'Job queue not ready.' })
  return boss
}

export async function stopBoss() {
  if (boss) {
    await boss.stop({ graceful: true })
    boss = null
  }
}
