// Flatten BlockNote block JSON to plain text for full-text search (searchText).
export function blocksToPlainText(blocks: unknown): string {
  const out: string[] = []

  function walkInline(content: unknown) {
    if (typeof content === 'string') {
      out.push(content)
      return
    }
    if (Array.isArray(content)) {
      for (const c of content) walkInline(c)
      return
    }
    if (content && typeof content === 'object') {
      const c = content as Record<string, unknown>
      if (typeof c.text === 'string') out.push(c.text)
      if (c.content) walkInline(c.content)
    }
  }

  function walk(list: unknown) {
    if (!Array.isArray(list)) return
    for (const b of list) {
      if (b && typeof b === 'object') {
        const bb = b as Record<string, unknown>
        walkInline(bb.content)
        if (Array.isArray(bb.children)) walk(bb.children)
      }
    }
  }

  walk(blocks)
  return out.join(' ').replace(/\s+/g, ' ').trim()
}
