import { describe, it, expect } from 'vitest'

describe('tree page movement and hierarchy', () => {
  // Simulates resolveNotebookId logic from server/api/tree.get.ts
  function resolveNotebookId(
    notes: { id: string; parentDocumentId: string | null; notebookId: string | null }[],
  ) {
    const docMap = new Map(notes.map((n) => [n.id, n]))
    return function (n: (typeof notes)[0]): string | null {
      let cur: (typeof notes)[0] | undefined = n
      const seen = new Set<string>()
      while (cur) {
        if (seen.has(cur.id)) break
        seen.add(cur.id)
        if (cur.parentDocumentId) {
          const p = docMap.get(cur.parentDocumentId)
          if (p) {
            cur = p
            continue
          }
        }
        return cur.notebookId
      }
      return n.notebookId
    }
  }

  // Simulates isDescendantOf logic from SidebarNote.vue
  function isDescendantOf(
    notes: { id: string; parentDocumentId: string | null }[],
    noteId: string,
    ancestorId: string,
  ): boolean {
    if (noteId === ancestorId) return true
    const byId = new Map(notes.map((n) => [n.id, n]))
    let cur: string | null = byId.get(noteId)?.parentDocumentId ?? null
    while (cur) {
      if (cur === ancestorId) return true
      cur = byId.get(cur)?.parentDocumentId ?? null
    }
    return false
  }

  it('resolves effective notebookId for deeply nested subpages to match root parent', () => {
    const notes = [
      { id: 'p1', parentDocumentId: null, notebookId: 'nb-2' }, // moved from nb-1 to nb-2
      { id: 'sub1', parentDocumentId: 'p1', notebookId: 'nb-1' }, // old notebookId
      { id: 'sub2', parentDocumentId: 'sub1', notebookId: 'nb-1' }, // old notebookId
      { id: 'target', parentDocumentId: null, notebookId: 'nb-2' },
    ]

    const resolver = resolveNotebookId(notes)
    expect(resolver(notes[0])).toBe('nb-2')
    expect(resolver(notes[1])).toBe('nb-2') // subpage resolves to nb-2!
    expect(resolver(notes[2])).toBe('nb-2') // sub-subpage resolves to nb-2!
  })

  it('prevents cycle when nesting a note under its own descendant', () => {
    const notes = [
      { id: 'A', parentDocumentId: null },
      { id: 'A1', parentDocumentId: 'A' },
      { id: 'A1_1', parentDocumentId: 'A1' },
      { id: 'B', parentDocumentId: null },
    ]

    expect(isDescendantOf(notes, 'A', 'A')).toBe(true)
    expect(isDescendantOf(notes, 'A1', 'A')).toBe(true)
    expect(isDescendantOf(notes, 'A1_1', 'A')).toBe(true)
    expect(isDescendantOf(notes, 'B', 'A')).toBe(false)
    expect(isDescendantOf(notes, 'A', 'B')).toBe(false)
  })

  it('correctly maps the full page tree when a parent page is nested under an existing page', () => {
    // Notebook has:
    // Existing page: B
    // Page A (with children A1 -> A2) moved under B
    const notes = [
      { id: 'B', parentDocumentId: null, position: 'b0' },
      { id: 'A', parentDocumentId: 'B', position: 'a0' },
      { id: 'A1', parentDocumentId: 'A', position: 'a0' },
      { id: 'A2', parentDocumentId: 'A1', position: 'a0' },
    ]

    // buildChildrenMap simulation
    const childrenMap = new Map<string, typeof notes>()
    for (const n of notes) {
      if (!n.parentDocumentId) continue
      const l = childrenMap.get(n.parentDocumentId)
      if (l) l.push(n)
      else childrenMap.set(n.parentDocumentId, [n])
    }

    const top = notes.filter((n) => !n.parentDocumentId)
    expect(top.map((n) => n.id)).toEqual(['B'])

    const bChildren = childrenMap.get('B') ?? []
    expect(bChildren.map((n) => n.id)).toEqual(['A'])

    const aChildren = childrenMap.get('A') ?? []
    expect(aChildren.map((n) => n.id)).toEqual(['A1'])

    const a1Children = childrenMap.get('A1') ?? []
    expect(a1Children.map((n) => n.id)).toEqual(['A2'])
  })
})
