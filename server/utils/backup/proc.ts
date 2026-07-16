// Child-process helpers for the backup subsystem. pg_dump / pg_restore / tar are expected on
// PATH (the production image installs postgresql-client-18 + tar). For local dev where the host
// has no PG18 client, set NUXT_PG_BIN_DIR to a directory holding the binaries; if it also has a
// lib/ subdir, it is added to LD_LIBRARY_PATH so relocated glibc binaries can find libpq.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function pgBinDir(): string {
  return (useRuntimeConfig().pgBinDir as string) || process.env.NUXT_PG_BIN_DIR || ''
}

// Full path to a Postgres binary (pg_dump / pg_restore), honouring NUXT_PG_BIN_DIR.
export function pgBin(name: string): string {
  const dir = pgBinDir()
  return dir ? join(dir, name) : name
}

function spawnEnv(): NodeJS.ProcessEnv {
  const dir = pgBinDir()
  const libDir = dir ? join(dir, 'lib') : ''
  if (libDir && existsSync(libDir)) {
    const prev = process.env.LD_LIBRARY_PATH
    return { ...process.env, LD_LIBRARY_PATH: prev ? `${libDir}:${prev}` : libDir }
  }
  return process.env
}

// Run a command to completion; reject with its (truncated) stderr on non-zero exit. stdout is
// inherited (progress from pg_* goes to the server log); stderr is captured for the error.
export function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'pipe'], env: spawnEnv() })
    let stderr = ''
    child.stderr?.on('data', (c) => (stderr += c))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-2000)}`)),
    )
  })
}
