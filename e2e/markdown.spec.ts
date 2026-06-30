import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('markdown import -> export round-trips standard content', async ({ page }) => {
  await login(page)
  const out = await page.evaluate(async () => {
    const md0 = '# Imported Note\n\n## Section\n\nHello **bold** text.\n\n- one\n- two\n'
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const res = await fetch('/api/import/markdown', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, files: [{ name: 'whatever.md', markdown: md0 }] }),
    }).then((r) => r.json())
    const docId = res.created[0].id as string
    const title = res.created[0].title as string
    const md1 = await fetch('/api/documents/' + docId + '/markdown').then((r) => r.text())
    await fetch('/api/documents/' + docId, { method: 'DELETE' })
    return { title, md1 }
  })
  expect(out.title).toBe('Imported Note') // leading H1 promoted to the note title
  expect(out.md1).toContain('# Imported Note')
  expect(out.md1).toContain('## Section')
  expect(out.md1).toContain('**bold**')
  expect(out.md1).toMatch(/[-*] one/)
  expect(out.md1).toMatch(/[-*] two/)
})

test('database block exports as a GFM table', async ({ page }) => {
  await login(page)
  const md = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Tbl' }),
    }).then((r) => r.json())
    const db = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id }),
    }).then((r) => r.json())
    const col = db.columns[0]
    await fetch('/api/databases/' + db.id + '/rows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values: { [col.id]: 'Row one' } }),
    })
    await fetch('/api/documents/' + doc.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'databaseTable', props: { databaseId: db.id } }] }),
    })
    const text = await fetch('/api/documents/' + doc.id + '/markdown').then((r) => r.text())
    await fetch('/api/documents/' + doc.id, { method: 'DELETE' })
    return text
  })
  expect(md).toContain('| Name |')
  expect(md).toContain('| --- |')
  expect(md).toContain('Row one')
})

test('bulk export produces a downloadable zip (pg-boss)', async ({ page }) => {
  test.setTimeout(60000)
  await login(page)
  const info = await page.evaluate(async () => {
    const { id } = await fetch('/api/export/markdown', { method: 'POST' }).then((r) => r.json())
    for (let i = 0; i < 50; i++) {
      const s = await fetch('/api/export/markdown/' + id).then((r) => r.json())
      if (s.status === 'done') {
        const buf = await fetch('/api/export/markdown/' + id + '?download=1').then((r) =>
          r.arrayBuffer(),
        )
        const b = new Uint8Array(buf)
        return { status: 'done', size: b.length, sig: String.fromCharCode(b[0], b[1]) }
      }
      if (s.status === 'error') return { status: 'error', error: s.error }
      await new Promise((r) => setTimeout(r, 500))
    }
    return { status: 'timeout' }
  })
  expect(info.status).toBe('done')
  expect(info.sig).toBe('PK') // zip magic bytes
  expect(info.size).toBeGreaterThan(0)
})
