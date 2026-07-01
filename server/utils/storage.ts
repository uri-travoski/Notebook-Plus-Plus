import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

// Local-filesystem attachment storage (§ uploads). One file per attachment, named
// by its storage key. Swap this module for an S3 driver later without touching routes.
export function uploadDir(): string {
  const cfg = (useRuntimeConfig().uploadDir as string) || ''
  return cfg.trim() ? resolve(cfg) : resolve(process.cwd(), '.data', 'uploads')
}

export async function ensureUploadDir(): Promise<string> {
  const dir = uploadDir()
  await mkdir(dir, { recursive: true })
  return dir
}

export function attachmentPath(key: string): string {
  return join(uploadDir(), key)
}
