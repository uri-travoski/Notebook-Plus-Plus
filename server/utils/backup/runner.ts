// Backup job: pg_dump + uploads dir (optional) + embedded secrets + manifest → single tar →
// AES-256-GCM encrypt (.npbk) → destination → retention prune. Nothing here reads or mutates the
// live app state beyond a read-only pg_dump.
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { databaseUrl } from '../../db'
import { uploadDir } from '../storage'
import { encryptFile } from './crypto'
import { appendHistory } from './history'
import { pgBin, run } from './proc'
import { APP_NAME, BACKUP_EXT, type Destination } from './shared'
import { createLocalDestination } from './destinations/local'
import { createS3Destination } from './destinations/s3'
import type { BackupConfig } from './config'

export function destinationFor(config: BackupConfig): Destination {
  return config.destination.type === 's3'
    ? createS3Destination(config.destination.s3)
    : createLocalDestination(config.destination.localPath)
}

// notebookpp-YYYYMMDD-HHMMSS
const timestamp = () =>
  new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')

function embeddedSecrets() {
  const cfg = useRuntimeConfig()
  return {
    // The DB dump contains ai_keys encrypted under this key; embedding it lets a restore into a
    // fresh instance re-key them so AI keys keep working. SESSION_PASSWORD is included so a full
    // rebuild can preserve sessions. A .npbk is encrypted, but treat it as sensitive.
    encryptionKey: cfg.encryptionKey || process.env.ENCRYPTION_KEY || '',
    sessionPassword: cfg.sessionPassword || process.env.NUXT_SESSION_PASSWORD || '',
  }
}

async function dirHasEntries(dir: string): Promise<boolean> {
  try {
    const s = await stat(dir)
    if (!s.isDirectory()) return false
    return (await readdir(dir)).length > 0
  } catch {
    return false
  }
}

export async function runBackup(config: BackupConfig): Promise<{ name: string; size: number }> {
  if (!config.password) throw new Error('Set a backup password first.')
  const started = Date.now()
  const name = `${APP_NAME}-${timestamp()}${BACKUP_EXT}`
  const workDir = join(tmpdir(), `notebookpp-backup-${Date.now()}`)
  const bundleDir = join(workDir, 'bundle')
  await mkdir(bundleDir, { recursive: true })

  const destination = destinationFor(config)
  try {
    await run(pgBin('pg_dump'), [
      '-Fc',
      '--no-owner',
      // pg-boss owns the `pgboss` schema (job queue). Excluding it keeps backups to app data and
      // means pg_restore --clean never drops the live queue out from under the running app.
      '--exclude-schema=pgboss',
      '-f',
      join(bundleDir, 'db.dump'),
      databaseUrl(),
    ])

    let includesUploads = false
    if (config.includeUploads) {
      const dir = uploadDir()
      if (await dirHasEntries(dir)) {
        await run('tar', ['-C', dir, '-cf', join(bundleDir, 'uploads.tar'), '.'])
        includesUploads = true
      }
    }

    await writeFile(join(bundleDir, 'secrets.json'), JSON.stringify(embeddedSecrets(), null, 2))
    await writeFile(
      join(bundleDir, 'manifest.json'),
      JSON.stringify(
        {
          formatVersion: 1,
          app: APP_NAME,
          createdAt: new Date().toISOString(),
          includesUploads,
        },
        null,
        2,
      ),
    )

    const bundleTar = join(workDir, 'bundle.tar')
    await run('tar', ['-C', bundleDir, '-cf', bundleTar, '.'])

    const encrypted = join(workDir, name)
    await encryptFile(bundleTar, encrypted, config.password)
    await destination.put(encrypted, name)

    // retention: keep the newest N, drop the rest
    const items = await destination.list()
    for (const item of items.slice(Math.max(1, config.retention))) {
      await destination.remove(item.name)
    }

    const { size } = await stat(encrypted)
    await appendHistory({
      type: 'backup',
      ok: true,
      name,
      size,
      location: destination.location,
      includesUploads,
      durationMs: Date.now() - started,
    })
    return { name, size }
  } catch (error) {
    await appendHistory({
      type: 'backup',
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
