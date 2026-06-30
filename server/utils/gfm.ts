export type DbColumn = { id: string; name: string; type: string; options?: string[] }
export type DbRow = { values: Record<string, unknown> }

// Serialise a database table to a GitHub-Flavoured-Markdown table.
export function databaseToGfm(columns: DbColumn[], rows: DbRow[]): string {
  if (!columns.length) return ''
  const header = '| ' + columns.map((c) => esc(c.name)).join(' | ') + ' |'
  const sep = '| ' + columns.map(() => '---').join(' | ') + ' |'
  const body = rows
    .map(
      (r) =>
        '| ' + columns.map((c) => esc(formatCell(r.values?.[c.id], c.type))).join(' | ') + ' |',
    )
    .join('\n')
  return [header, sep, body].filter(Boolean).join('\n')
}

function formatCell(value: unknown, type: string): string {
  if (value == null || value === '') return ''
  if (type === 'checkbox') return value ? '[x]' : '[ ]'
  if (type === 'multiselect' && Array.isArray(value)) return value.join(', ')
  if (type === 'date') return String(value).slice(0, 10)
  return String(value)
}

function esc(s: string): string {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
