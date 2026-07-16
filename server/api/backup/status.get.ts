import { getUserId } from '../../utils/guard'
import { loadConfig } from '../../utils/backup/config'
import { readHistory } from '../../utils/backup/history'
import { currentJob } from '../../utils/backup/state'

// Snapshot for the Settings → Backup header: schedule, destination, whether a password is set,
// the running job (if any) and the last successful backup.
export default defineEventHandler(async (event) => {
  await getUserId(event)
  const config = await loadConfig()
  const history = await readHistory(50)
  const lastBackup = history.find((h) => h.type === 'backup' && h.ok) ?? null
  return {
    schedule: config.schedule,
    destinationType: config.destination.type,
    passwordSet: !!config.password,
    includeUploads: config.includeUploads,
    running: currentJob(),
    lastBackup,
  }
})
