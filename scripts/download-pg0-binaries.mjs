#!/usr/bin/env node
// Downloads pg0 binaries for all platforms into src-tauri/binaries/
// Usage: node scripts/download-pg0-binaries.mjs [--platform linux|windows|macos|all]
import { mkdirSync, existsSync, createWriteStream, renameSync, chmodSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const destDir = resolve(root, 'src-tauri/binaries')

const BASE_URL = 'https://github.com/vectorize-io/pg0/releases/latest/download'

const PLATFORMS = {
  'linux-x86_64': {
    url: `${BASE_URL}/pg0-linux-x86_64-gnu`,
    target: 'x86_64-unknown-linux-gnu',
  },
  'linux-aarch64': {
    url: `${BASE_URL}/pg0-linux-aarch64-gnu`,
    target: 'aarch64-unknown-linux-gnu',
  },
  'macos-arm64': {
    url: `${BASE_URL}/pg0-darwin-aarch64`,
    target: 'aarch64-apple-darwin',
  },
  'macos-x86_64': {
    url: `${BASE_URL}/pg0-darwin-x86_64`,
    target: 'x86_64-apple-darwin',
  },
  'windows-x86_64': {
    url: `${BASE_URL}/pg0-windows-x86_64.exe`,
    target: 'x86_64-pc-windows-msvc',
    ext: '.exe',
  },
}

async function download(url, dest) {
  console.log(`  Downloading ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { writeFileSync } = await import('fs')
  writeFileSync(dest, buf)
}

async function main() {
  const arg = process.argv[2] || 'all'
  mkdirSync(destDir, { recursive: true })

  const entries = arg === 'all'
    ? Object.entries(PLATFORMS)
    : Object.entries(PLATFORMS).filter(([key]) => key.startsWith(arg))

  if (entries.length === 0) {
    console.error(`Unknown platform: ${arg}`)
    console.error(`Available: ${Object.keys(PLATFORMS).join(', ')}, or 'all'`)
    process.exit(1)
  }

  for (const [name, { url, target, ext = '' }] of entries) {
    const filename = `pg0-${target}${ext}`
    const dest = resolve(destDir, filename)
    if (existsSync(dest)) {
      console.log(`  ${filename} already exists, skipping.`)
      continue
    }
    try {
      await download(url, dest)
      if (!ext) chmodSync(dest, 0o755)
      console.log(`  ✓ ${filename}`)
    } catch (e) {
      console.error(`  ✗ ${filename}: ${e.message}`)
    }
  }

  console.log('\nDone. Binaries in', destDir)
}

main().catch(e => { console.error(e); process.exit(1) })
