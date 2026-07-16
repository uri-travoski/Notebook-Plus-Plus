import { getUserId } from '../../../utils/guard'
import { loadConfig } from '../../../utils/backup/config'
import { validateBackup } from '../../../utils/backup/restore'

// Confirm the password decrypts the chosen backup — changes nothing.
export default defineEventHandler(async (event) => {
  await getUserId(event)
  const { name, password } = (await readBody<{ name?: string; password?: string }>(event)) ?? {}
  if (!name || !password) {
    throw createError({ statusCode: 400, statusMessage: 'name and password are required.' })
  }
  try {
    return { valid: await validateBackup(await loadConfig(), name, password) }
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: e instanceof Error ? e.message : 'Could not read the backup.',
    })
  }
})
