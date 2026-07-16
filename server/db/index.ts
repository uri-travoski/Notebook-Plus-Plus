import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let pool: Pool | undefined
let db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function databaseUrl(): string {
  const url = useRuntimeConfig().databaseUrl || process.env.NUXT_DATABASE_URL
  if (!url) throw new Error('NUXT_DATABASE_URL is not set')
  return url
}

export function useDb() {
  if (!db) {
    pool = new Pool({ connectionString: databaseUrl() })
    db = drizzle(pool, { schema, casing: 'snake_case' })
  }
  return db
}

// Close the pool and drop the cached handle. Used by restore to release every connection to the
// target database before `pg_restore --clean` drops and recreates its objects; the next useDb()
// transparently reconnects.
export async function closeDb(): Promise<void> {
  const p = pool
  pool = undefined
  db = undefined
  if (p) await p.end()
}

export { schema }
