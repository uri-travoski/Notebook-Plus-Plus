import { EXPORT_QUEUE, startBoss, stopBoss } from '../utils/boss'
import { runExportJob } from '../jobs/export-markdown'

// Start pg-boss and register workers on server boot; stop gracefully on shutdown.
export default defineNitroPlugin(async (nitro) => {
  const boss = await startBoss()
  if (!boss) return
  await boss.work(EXPORT_QUEUE, async ([job]) => {
    await runExportJob(job.data as { exportId: string })
  })
  nitro.hooks.hook('close', async () => {
    await stopBoss()
  })
})
