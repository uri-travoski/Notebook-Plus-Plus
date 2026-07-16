import { getUserId } from '../../utils/guard'
import { loadConfig } from '../../utils/backup/config'
import { runBackup } from '../../utils/backup/runner'
import { endJob, startJob } from '../../utils/backup/state'

// Kick off a manual backup. Returns immediately; the UI polls /api/backup/status for progress.
export default defineEventHandler(async (event) => {
  await getUserId(event)
  const config = await loadConfig()
  if (!config.password) {
    throw createError({ statusCode: 400, statusMessage: 'Set a backup password first.' })
  }
  if (!startJob('backup', 'Backup running…')) {
    throw createError({ statusCode: 409, statusMessage: 'A backup or restore is already running.' })
  }
  runBackup(config)
    .catch((e) => console.error('[backup] manual run failed:', e))
    .finally(() => endJob())
  return { started: true }
})
