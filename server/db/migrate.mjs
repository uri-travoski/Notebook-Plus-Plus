// Standalone migrator — plain ESM so it runs in the production container with
// only `drizzle-orm` + `pg` (no tsx/dotenv). Dev loads .env via `node --env-file`.
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const url = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL is not set')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url })
await migrate(drizzle(pool), { migrationsFolder: './server/db/migrations' })
await pool.end()
console.log('Migrations applied.')
