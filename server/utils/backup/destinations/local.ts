// Local-folder destination. Backups land in <localPath>/notebookpp/ (see [[backups-under-app-folder]]).
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'

import { APP_NAME, BACKUP_EXT, type Destination } from '../shared'

// Empty path → <cwd>/.data/backups (dev). In the container the operator mounts a host dir at
// /backups and sets localPath to it.
export function resolveLocalBase(localPath: string): string {
  const root = localPath.trim() ? resolve(localPath) : resolve(process.cwd(), '.data', 'backups')
  return join(root, APP_NAME)
}

export function createLocalDestination(localPath: string): Destination {
  const BASE = resolveLocalBase(localPath)
  return {
    kind: 'local',
    location: BASE,
    async put(filePath, name) {
      await mkdir(BASE, { recursive: true })
      await pipeline(createReadStream(filePath), createWriteStream(join(BASE, name)))
    },
    async list() {
      await mkdir(BASE, { recursive: true })
      const names = (await readdir(BASE)).filter((n) => n.endsWith(BACKUP_EXT))
      const items = []
      for (const name of names) {
        const s = await stat(join(BASE, name))
        items.push({ name, size: s.size, modifiedAt: s.mtime.toISOString() })
      }
      return items.sort((a, b) => b.name.localeCompare(a.name))
    },
    async fetch(name, destPath) {
      await pipeline(createReadStream(join(BASE, name)), createWriteStream(destPath))
    },
    async remove(name) {
      await rm(join(BASE, name), { force: true })
    },
  }
}
