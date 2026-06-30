import { ServerBlockNoteEditor } from '@blocknote/server-util'
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { databaseToGfm, type DbColumn } from './gfm'

// Server-side BlockNote <-> Markdown (GFM). Canonical stored form is BlockNote JSON;
// Markdown is derived on demand (export) and parsed back on import (§14). Custom blocks
// (callout/math/databaseTable) are lossy-special-cased before handing standard blocks to
// BlockNote's own serialiser.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _editor: any = null
function editor() {
  if (!_editor) _editor = ServerBlockNoteEditor.create()
  return _editor
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = Record<string, any>

function inlineText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((c) => (c && typeof c === 'object' && typeof c.text === 'string' ? c.text : ''))
    .join('')
}

// Fetch a database table and render it as a GFM table.
async function databaseMarkdown(databaseId: string): Promise<string> {
  const db = useDb()
  const [database] = await db
    .select()
    .from(schema.databases)
    .where(eq(schema.databases.id, databaseId))
    .limit(1)
  if (!database) return ''
  const rows = await db
    .select()
    .from(schema.databaseRows)
    .where(eq(schema.databaseRows.databaseId, databaseId))
    .orderBy(asc(schema.databaseRows.position))
  const cols = database.columns as DbColumn[]
  return databaseToGfm(
    cols,
    rows.map((r) => ({ values: (r.values ?? {}) as Record<string, unknown> })),
  )
}

// Convert a page's BlockNote blocks to Markdown. Custom blocks become placeholder paragraphs
// (letters only, so the serialiser never escapes them) that we substitute with raw Markdown after.
export async function blocksToMarkdown(blocks: unknown): Promise<string> {
  if (!Array.isArray(blocks)) return ''
  const replacements = new Map<string, string>()
  const out: Block[] = []

  for (const raw of blocks as Block[]) {
    const b = raw && typeof raw === 'object' ? raw : null
    if (!b) continue
    if (b.type === 'databaseTable') {
      const token = `xnbtablex${replacements.size}x`
      replacements.set(token, await databaseMarkdown(String(b.props?.databaseId ?? '')))
      out.push({ type: 'paragraph', content: [{ type: 'text', text: token, styles: {} }] })
    } else if (b.type === 'math') {
      const token = `xnbmathx${replacements.size}x`
      replacements.set(token, `$$\n${inlineText(b.content)}\n$$`)
      out.push({ type: 'paragraph', content: [{ type: 'text', text: token, styles: {} }] })
    } else if (b.type === 'callout') {
      // Degrade to a blockquote, prefixing the kind so it survives the round-trip readably.
      const label = { type: 'text', text: `[${b.props?.kind ?? 'info'}] `, styles: { bold: true } }
      const content = Array.isArray(b.content) ? b.content : []
      out.push({ type: 'quote', content: [label, ...content] })
    } else {
      out.push(b)
    }
  }

  let md: string
  try {
    md = await editor().blocksToMarkdownLossy(out)
  } catch {
    md = ''
  }
  for (const [token, value] of replacements) md = md.split(token).join(value)
  return md.trim() + '\n'
}

// Serialise a whole document (page or canvas) to Markdown.
export async function documentToMarkdown(doc: {
  title: string
  type: string
  content: unknown
}): Promise<string> {
  const heading = `# ${doc.title || 'Untitled'}\n\n`
  if (doc.type === 'canvas') {
    return heading + '_Canvas document (Excalidraw) — open in Notebook++ to view or edit._\n'
  }
  return heading + (await blocksToMarkdown(doc.content))
}

// Parse Markdown into BlockNote blocks (standard blocks; custom blocks are not reconstructed).
export async function markdownToBlocks(md: string): Promise<unknown[]> {
  const blocks = await editor().tryParseMarkdownToBlocks(md)
  return Array.isArray(blocks) ? blocks : []
}
