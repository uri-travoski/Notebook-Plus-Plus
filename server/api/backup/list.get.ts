import { getUserId } from '../../utils/guard'
import { loadConfig } from '../../utils/backup/config'
import { destinationFor } from '../../utils/backup/runner'

// List the backups at the configured destination.
export default defineEventHandler(async (event) => {
  await getUserId(event)
  try {
    return await destinationFor(await loadConfig()).list()
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: e instanceof Error ? e.message : 'Could not list backups.',
    })
  }
})
