import { BACKUP_QUEUE, EXPORT_QUEUE, startBoss, stopBoss } from '../utils/boss'
import { runExportJob } from '../jobs/export-markdown'
import { loadConfig } from '../utils/backup/config'
import { rescheduleBackups } from '../utils/backup/schedule'
import { runBackup } from '../utils/backup/runner'
import { endJob, startJob } from '../utils/backup/state'

// Start pg-boss and register workers on server boot; stop gracefully on shutdown.
export default defineNitroPlugin(async (nitro) => {
  const boss = await startBoss()
  if (!boss) return
  await boss.work(EXPORT_QUEUE, async ([job]) => {
    await runExportJob(job.data as { exportId: string })
  })
  // Scheduled backups land here (cron fires → job on BACKUP_QUEUE). The single-job guard skips
  // the run if a manual backup or a restore is already in flight.
  await boss.work(BACKUP_QUEUE, async () => {
    if (!startJob('backup', 'Scheduled backup running…')) return
    try {
      await runBackup(await loadConfig())
    } catch (e) {
      console.error('[backup] scheduled run failed:', e)
    } finally {
      endJob()
    }
  })
  // Apply the saved schedule. Tolerate a missing table on very first boot (pre-migration).
  await rescheduleBackups().catch((e) => console.error('[backup] schedule init failed:', e))
  nitro.hooks.hook('close', async () => {
    await stopBoss()
  })
})
