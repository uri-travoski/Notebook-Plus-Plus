// Self-host Excalidraw fonts (no CDN). Copies the prod fonts into public/fonts so
// they're served at /fonts/* (with window.EXCALIDRAW_ASSET_PATH = "/"). Run on
// postinstall; the 14MB of fonts are gitignored, not committed.
import { cp, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const src = 'node_modules/@excalidraw/excalidraw/dist/prod/fonts'
const dest = 'public/fonts'

if (existsSync(src)) {
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log('Copied Excalidraw fonts -> public/fonts')
} else {
  console.warn('Excalidraw fonts not found at', src, '— skipping')
}
