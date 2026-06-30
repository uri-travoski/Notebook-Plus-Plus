import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { EXPORT_QUEUE, useBoss } from '../../utils/boss'

// Enqueue a bulk Markdown export (pg-boss). Returns the job id to poll/download.
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const db = useDb()
  const [row] = await db
    .insert(schema.exportJobs)
    .values({ userId, status: 'pending' })
    .returning({ id: schema.exportJobs.id })
  await useBoss().send(EXPORT_QUEUE, { exportId: row.id })
  return { id: row.id }
})
