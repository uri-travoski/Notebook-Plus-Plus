import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { createLocalDestination, resolveLocalBase } from '../server/utils/backup/destinations/local'

describe('local backup destination', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'npbk-dest-'))
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('nests backups under an app-named folder', () => {
    expect(basename(resolveLocalBase(root))).toBe('notebookpp')
  })

  it('puts, lists (newest first, .npbk only), fetches and removes', async () => {
    const dest = createLocalDestination(root)

    const a = join(root, 'a.npbk')
    const b = join(root, 'b.npbk')
    await writeFile(a, 'AAA')
    await writeFile(b, 'BBBBB')
    await dest.put(a, 'notebookpp-20260101-000000.npbk')
    await dest.put(b, 'notebookpp-20260102-000000.npbk')
    // a non-backup file in the folder must be ignored by list()
    await writeFile(join(resolveLocalBase(root), 'README.txt'), 'ignore me')

    const items = await dest.list()
    expect(items.map((i) => i.name)).toEqual([
      'notebookpp-20260102-000000.npbk', // newest first
      'notebookpp-20260101-000000.npbk',
    ])
    expect(items[0].size).toBe(5)

    const out = join(root, 'fetched.npbk')
    await dest.fetch('notebookpp-20260101-000000.npbk', out)
    expect(await readFile(out, 'utf8')).toBe('AAA')

    await dest.remove('notebookpp-20260101-000000.npbk')
    const after = await dest.list()
    expect(after.map((i) => i.name)).toEqual(['notebookpp-20260102-000000.npbk'])
  })

  it('applies retention by removing all but the newest N', async () => {
    const dest = createLocalDestination(root)
    const src = join(root, 's.npbk')
    await writeFile(src, 'x')
    for (const d of ['01', '02', '03', '04', '05']) {
      await dest.put(src, `notebookpp-202601${d}-000000.npbk`)
    }
    const retention = 3
    const items = await dest.list()
    for (const item of items.slice(Math.max(1, retention))) await dest.remove(item.name)

    const kept = (await dest.list()).map((i) => i.name)
    expect(kept).toEqual([
      'notebookpp-20260105-000000.npbk',
      'notebookpp-20260104-000000.npbk',
      'notebookpp-20260103-000000.npbk',
    ])
    // the folder really only holds those three
    expect((await readdir(resolveLocalBase(root))).filter((n) => n.endsWith('.npbk')).length).toBe(
      3,
    )
  })
})
