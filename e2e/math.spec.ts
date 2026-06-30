import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('math block renders KaTeX', async ({ page }) => {
  await login(page)

  const id = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Math' }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + doc.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'math', content: 'e = mc^2' }] }),
    })
    return doc.id as string
  })

  await page.goto('/doc/' + id)
  await expect(page.locator('.nb-math-preview .katex').first()).toBeVisible()

  await page.evaluate((docId) => fetch('/api/documents/' + docId, { method: 'DELETE' }), id)
})
