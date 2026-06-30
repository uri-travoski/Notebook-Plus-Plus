import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let pool: Pool | undefined
let db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function useDb() {
  if (!db) {
    const url = useRuntimeConfig().databaseUrl || process.env.NUXT_DATABASE_URL
    if (!url) throw new Error('NUXT_DATABASE_URL is not set')
    pool = new Pool({ connectionString: url })
    db = drizzle(pool, { schema, casing: 'snake_case' })
  }
  return db
}

export { schema }
