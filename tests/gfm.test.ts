import { describe, it, expect } from 'vitest'
import { databaseToGfm } from '../server/utils/gfm'

describe('databaseToGfm', () => {
  it('serialises columns + rows to a GFM table with typed cells', () => {
    const cols = [
      { id: 'a', name: 'Name', type: 'text' },
      { id: 'b', name: 'Tags', type: 'multiselect' },
      { id: 'c', name: 'Due', type: 'date' },
      { id: 'd', name: 'Done', type: 'checkbox' },
    ]
    const rows = [
      { values: { a: 'Task 1', b: ['x', 'y'], c: '2026-07-01T00:00:00Z', d: true } },
      { values: { a: 'Task 2', d: false } },
    ]
    const md = databaseToGfm(cols, rows)
    expect(md).toContain('| Name | Tags | Due | Done |')
    expect(md).toContain('| --- | --- | --- | --- |')
    expect(md).toContain('| Task 1 | x, y | 2026-07-01 | [x] |')
    expect(md).toContain('| Task 2 |  |  | [ ] |')
  })

  it('escapes pipes and returns empty for no columns', () => {
    expect(databaseToGfm([], [])).toBe('')
    const md = databaseToGfm([{ id: 'a', name: 'A|B', type: 'text' }], [{ values: { a: 'x|y' } }])
    expect(md).toContain('A\\|B')
    expect(md).toContain('x\\|y')
  })
})
