import { cpSync, mkdirSync, existsSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dest = resolve(root, 'src-tauri/resources/server')
const publicDest = resolve(root, 'src-tauri/resources/public')

if (existsSync(dest)) rmSync(dest, { recursive: true })
if (existsSync(publicDest)) rmSync(publicDest, { recursive: true })
mkdirSync(dest, { recursive: true })

// 1. Nitro server output (.output/server → resources/server)
const serverSrc = resolve(root, '.output/server')
if (!existsSync(serverSrc)) {
  console.error('Run "npm run build" first — .output/server not found')
  process.exit(1)
}
console.log('Copying .output/server → resources/server ...')
cpSync(serverSrc, dest, { recursive: true })

// 2. Public assets (.output/public → resources/public)
const publicSrc = resolve(root, '.output/public')
if (existsSync(publicSrc)) {
  console.log('Copying .output/public → resources/public ...')
  cpSync(publicSrc, publicDest, { recursive: true })
}

// 3. Migration files (server/db/migrations → resources/server/db/migrations)
const migrationsSrc = resolve(root, 'server/db/migrations')
const migrationsDest = resolve(dest, 'db/migrations')
if (existsSync(migrationsSrc)) {
  console.log('Copying migrations → resources/server/db/migrations ...')
  cpSync(migrationsSrc, migrationsDest, { recursive: true })
}

// 4. Migrate script (server/db/migrate.mjs → resources/server/db/migrate.mjs)
const migrateSrc = resolve(root, 'server/db/migrate.mjs')
if (existsSync(migrateSrc)) {
  cpSync(migrateSrc, resolve(dest, 'db/migrate.mjs'))
}

// 5. Seed directory (server/db/seed → resources/server/db/seed)
const seedSrc = resolve(root, 'server/db/seed')
if (existsSync(seedSrc)) {
  cpSync(seedSrc, resolve(dest, 'db/seed'), { recursive: true })
}

console.log('Tauri resources prepared at', dest)
