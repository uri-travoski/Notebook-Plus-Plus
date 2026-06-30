import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('callout block renders by kind and appears in the slash menu', async ({ page }) => {
  await login(page)

  const id = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Callout' }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + doc.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'callout', props: { kind: 'warning' }, content: 'A warning callout.' }],
      }),
    })
    return doc.id as string
  })

  await page.goto('/doc/' + id)
  await expect(page.locator('.nb-callout-warning')).toBeVisible()
  await expect(page.locator('.nb-callout')).toContainText('A warning callout')

  // Callout is offered in the slash menu.
  await page.locator('[contenteditable="true"]').first().click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('/callout')
  await expect(page.getByText('Callout', { exact: false }).first()).toBeVisible()

  await page.evaluate((docId) => fetch('/api/documents/' + docId, { method: 'DELETE' }), id)
})
