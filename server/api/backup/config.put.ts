import { getUserId } from '../../utils/guard'
import { redactedConfig, saveConfig, type ConfigInput } from '../../utils/backup/config'
import { rescheduleBackups } from '../../utils/backup/schedule'

// Save settings, then re-apply the pg-boss schedule. Secrets equal to '********' are kept as-is
// (see saveConfig); any other value replaces them.
export default defineEventHandler(async (event) => {
  await getUserId(event)
  const body = await readBody<ConfigInput>(event)
  await saveConfig(body ?? {})
  await rescheduleBackups().catch((e) => console.error('[backup] reschedule failed:', e))
  return redactedConfig()
})
