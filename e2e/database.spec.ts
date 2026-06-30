import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('database block: renders, adds a row, persists across reload', async ({ page }) => {
  await login(page)

  const id = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'DB Test' }),
    }).then((r) => r.json())
    const db = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + doc.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'databaseTable', props: { databaseId: db.id } }],
      }),
    })
    return doc.id as string
  })

  await page.goto('/doc/' + id)
  await expect(page.locator('.nb-db-table')).toBeVisible()

  await page.locator('.nb-db-addrow').click()
  await expect(page.locator('.nb-db-table tbody tr')).toHaveCount(1)

  await page.reload()
  await expect(page.locator('.nb-db-table')).toBeVisible()
  await expect(page.locator('.nb-db-table tbody tr')).toHaveCount(1)

  await page.evaluate((docId) => fetch('/api/documents/' + docId, { method: 'DELETE' }), id)
})
