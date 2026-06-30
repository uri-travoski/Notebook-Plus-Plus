import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('a page note edits, autosaves, and persists across reload', async ({ page }) => {
  await login(page)

  // Create a fresh page note via the API (deterministic, no seed dependency).
  const id = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0]?.notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Editor Test' }),
    }).then((r) => r.json())
    return doc.id as string
  })

  await page.goto('/doc/' + id)
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(1)

  const marker = 'E2E' + Date.now()
  await page.locator('[contenteditable="true"]').first().click()
  await page.keyboard.type(marker)

  // wait for the debounced autosave PATCH to succeed
  await page.waitForResponse(
    (r) =>
      r.url().includes('/api/documents/') && r.request().method() === 'PATCH' && r.status() === 200,
  )

  await page.reload()
  await expect(page.locator('.bn-editor')).toContainText(marker)

  // cleanup
  await page.evaluate((docId) => fetch('/api/documents/' + docId, { method: 'DELETE' }), id)
})
