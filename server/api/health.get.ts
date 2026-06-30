import { sql } from 'drizzle-orm'
import { useDb } from '../db'

export default defineEventHandler(async () => {
  let database: 'ok' | 'error'
  try {
    await useDb().execute(sql`select 1`)
    database = 'ok'
  } catch {
    database = 'error'
  }
  return { app: 'ok', database, time: new Date().toISOString() }
})
