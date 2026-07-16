import { getUserId } from '../../utils/guard'
import { redactedConfig } from '../../utils/backup/config'

export default defineEventHandler(async (event) => {
  await getUserId(event)
  return redactedConfig()
})
