import { getUserId } from '../../../utils/guard'
import { loadConfig } from '../../../utils/backup/config'
import { runRestore } from '../../../utils/backup/restore'
import { endJob, setJobMessage, startJob } from '../../../utils/backup/state'

// Destructive: replaces the database and (if included) uploads. Requires the password to verify
// and a typed "RESTORE" confirmation. Returns immediately; the UI polls status for progress.
export default defineEventHandler(async (event) => {
  await getUserId(event)
  const { name, password, confirm } =
    (await readBody<{
      name?: string
      password?: string
      confirm?: string
    }>(event)) ?? {}
  if (confirm !== 'RESTORE') {
    throw createError({ statusCode: 400, statusMessage: 'Type RESTORE to confirm.' })
  }
  if (!name || !password) {
    throw createError({ statusCode: 400, statusMessage: 'name and password are required.' })
  }
  if (!startJob('restore', 'Restore starting…')) {
    throw createError({ statusCode: 409, statusMessage: 'A backup or restore is already running.' })
  }
  const config = await loadConfig()
  runRestore(config, name, password, (m) => setJobMessage(m))
    .catch((e) => console.error('[backup] restore failed:', e))
    .finally(() => endJob())
  return { started: true }
})
