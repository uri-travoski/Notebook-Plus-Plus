import 'dotenv/config'
import { execSync } from 'node:child_process'
import pg from 'pg'

const TABLES = [
  'users',
  'projects',
  'notebooks',
  'documents',
  'document_versions',
  'databases',
  'database_rows',
  'attachments',
  'ai_keys',
  'password_reset_tokens',
]

const url = process.env.NUXT_DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL is not set')
  process.exit(1)
}

// Ensure the schema is current, then wipe, then seed — gives §24 exact counts.
execSync('npm run db:migrate', { stdio: 'inherit' })

const pool = new pg.Pool({ connectionString: url })
await pool.query(
  `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
)
await pool.end()
console.log('Reset: truncated all tables.')

execSync('npm run db:seed', { stdio: 'inherit' })
