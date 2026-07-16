// Apply the configured schedule to pg-boss. Called on boot and whenever settings are saved.
import { BACKUP_QUEUE, useBoss } from '../boss'
import { CRON_BY_SCHEDULE, loadConfig } from './config'

export async function rescheduleBackups(): Promise<void> {
  const boss = useBoss()
  const { schedule } = await loadConfig()
  const cron = CRON_BY_SCHEDULE[schedule] ?? null
  // Replace any existing cron entry for the queue.
  await boss.unschedule(BACKUP_QUEUE).catch(() => {})
  if (cron) await boss.schedule(BACKUP_QUEUE, cron)
}
