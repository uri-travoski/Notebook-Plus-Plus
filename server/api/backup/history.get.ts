import { getUserId } from '../../utils/guard'
import { readHistory } from '../../utils/backup/history'

export default defineEventHandler(async (event) => {
  await getUserId(event)
  return readHistory(50)
})
