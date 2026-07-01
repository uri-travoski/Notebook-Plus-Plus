import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('version history: snapshots the prior content on edit and restores it', async ({ page }) => {
  await login(page)
  const r = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((res) => res.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Versioned' }),
    }).then((res) => res.json())

    const patch = (text: string) =>
      fetch('/api/documents/' + doc.id, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: [{ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] }],
        }),
      })

    await patch('version one') // prior content is empty -> no snapshot
    await patch('version two') // prior is 'version one' -> snapshot it

    const versions = await fetch('/api/documents/' + doc.id + '/versions').then((res) => res.json())
    const vid = versions[0]?.id
    const vcontent = await fetch('/api/documents/' + doc.id + '/versions/' + vid).then((res) =>
      res.json(),
    )
    await fetch('/api/documents/' + doc.id + '/versions/' + vid + '/restore', { method: 'POST' })
    const after = await fetch('/api/documents/' + doc.id).then((res) => res.json())
    const versionsAfter = await fetch('/api/documents/' + doc.id + '/versions').then((res) =>
      res.json(),
    )
    await fetch('/api/documents/' + doc.id, { method: 'DELETE' })

    return {
      vcount: versions.length,
      versionHasOne: JSON.stringify(vcontent.content).includes('version one'),
      restoredToOne: JSON.stringify(after.content).includes('version one'),
      snapshottedCurrentOnRestore: versionsAfter.length === 2,
    }
  })
  expect(r.vcount).toBe(1)
  expect(r.versionHasOne).toBe(true)
  expect(r.restoredToOne).toBe(true)
  expect(r.snapshottedCurrentOnRestore).toBe(true)
})

test('History button opens the version dialog', async ({ page }) => {
  await login(page)
  const id = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'HistUI' }),
    }).then((r) => r.json())
    return doc.id as string
  })
  await page.goto('/doc/' + id)
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByRole('heading', { name: 'Version history' })).toBeVisible()
  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), id)
})
