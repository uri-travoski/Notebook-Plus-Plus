// Restore job: fetch → verify password → decrypt (GCM-verified) → untar → close the app DB pool
// → pg_restore --clean → restore uploads → migrate → re-key ai_keys → reopen pool. Nothing
// destructive happens before the password validates and the archive fully decrypts.
//
// Runs in-process (no sidecar, no container restart): sessions are sealed cookies so the app
// stays reachable throughout. pg-boss keeps its own `pgboss` schema, which is excluded from the
// dump, so it is untouched by pg_restore; the single-job guard (state.ts) stops a scheduled
// backup from firing mid-restore.
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { eq } from 'drizzle-orm'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Pool } from 'pg'

import { closeDb, databaseUrl, useDb, schema } from '../../db'
import { uploadDir } from '../storage'
import { decryptSecretWith, encryptSecret } from '../crypto'
import { decryptFile, validatePassword } from './crypto'
import { appendHistory } from './history'
import { pgBin, run } from './proc'
import { destinationFor } from './runner'
import type { BackupConfig } from './config'

// Fetch + fast password check only. Downloads nothing destructive; used by the UI to confirm the
// password before offering the (destructive) restore.
export async function validateBackup(
  config: BackupConfig,
  name: string,
  password: string,
): Promise<boolean> {
  const workDir = join(tmpdir(), `notebookpp-validate-${Date.now()}`)
  await mkdir(workDir, { recursive: true })
  try {
    const archive = join(workDir, name)
    await destinationFor(config).fetch(name, archive)
    return await validatePassword(archive, password)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

// Re-encrypt every ai_keys secret from the backup's ENCRYPTION_KEY to the running instance's key,
// so AI keys keep working after a restore into an instance with a different key. No-op when the
// keys match. Runs on a fresh pool after the pool has been reopened.
async function rekeyAiKeys(oldKey: string): Promise<number> {
  const currentKey = useRuntimeConfig().encryptionKey || process.env.ENCRYPTION_KEY || ''
  if (!oldKey || oldKey === currentKey) return 0
  const db = useDb()
  const rows = await db.select().from(schema.aiKeys)
  let rekeyed = 0
  for (const row of rows) {
    let plain: string
    try {
      plain = decryptSecretWith(row.encryptedKey, row.iv, row.authTag, oldKey)
    } catch {
      continue // already under the current key, or unreadable — leave as-is
    }
    const next = encryptSecret(plain)
    await db
      .update(schema.aiKeys)
      .set({ encryptedKey: next.ciphertext, iv: next.iv, authTag: next.authTag })
      .where(eq(schema.aiKeys.id, row.id))
    rekeyed++
  }
  return rekeyed
}

export async function runRestore(
  config: BackupConfig,
  name: string,
  password: string,
  progress: (message: string) => void = () => {},
): Promise<{ ok: true; rekeyed: number }> {
  const started = Date.now()
  const workDir = join(tmpdir(), `notebookpp-restore-${Date.now()}`)
  const bundleDir = join(workDir, 'bundle')
  await mkdir(bundleDir, { recursive: true })

  try {
    progress('Downloading backup…')
    const archive = join(workDir, name)
    await destinationFor(config).fetch(name, archive)

    progress('Verifying password…')
    if (!(await validatePassword(archive, password))) {
      throw new Error('Wrong backup password.')
    }

    progress('Decrypting and verifying archive integrity…')
    const bundleTar = join(workDir, 'bundle.tar')
    await decryptFile(archive, bundleTar, password)

    progress('Unpacking…')
    await run('tar', ['-C', bundleDir, '-xf', bundleTar])
    const manifest = JSON.parse(await readFile(join(bundleDir, 'manifest.json'), 'utf8'))
    let secrets: { encryptionKey?: string } = {}
    try {
      secrets = JSON.parse(await readFile(join(bundleDir, 'secrets.json'), 'utf8'))
    } catch {
      // older/foreign backup without embedded secrets — restore data, skip re-key
    }

    // Release the app's connections so pg_restore --clean can drop/recreate objects.
    progress('Closing database connections…')
    await closeDb()

    progress('Restoring database (pg_restore --clean)…')
    await run(pgBin('pg_restore'), [
      '--clean',
      '--if-exists',
      '--no-owner',
      '-d',
      databaseUrl(),
      join(bundleDir, 'db.dump'),
    ])

    if (manifest.includesUploads && existsSync(join(bundleDir, 'uploads.tar'))) {
      progress('Restoring uploads…')
      const dir = uploadDir()
      await mkdir(dir, { recursive: true })
      await run('sh', ['-c', `rm -rf "${dir}"/* "${dir}"/.[!.]* 2>/dev/null; true`])
      await run('tar', ['-C', dir, '-xf', join(bundleDir, 'uploads.tar')])
    }

    // Bring the (possibly older) restored schema up to the running code's version.
    progress('Running migrations…')
    const pool = new Pool({ connectionString: databaseUrl() })
    try {
      await migrate(drizzle(pool), { migrationsFolder: './server/db/migrations' })
    } finally {
      await pool.end()
    }

    progress('Re-keying AI provider keys…')
    const rekeyed = await rekeyAiKeys(secrets.encryptionKey ?? '')

    await appendHistory({
      type: 'restore',
      ok: true,
      name,
      includesUploads: !!manifest.includesUploads,
      durationMs: Date.now() - started,
    })
    return { ok: true, rekeyed }
  } catch (error) {
    await appendHistory({
      type: 'restore',
      ok: false,
      name,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    })
    throw error
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
