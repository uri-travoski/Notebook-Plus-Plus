import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('drag-reorder a note within its notebook', async ({ page }) => {
  await login(page)

  // Create a dedicated notebook with two notes (A then B) so order is unambiguous.
  const ids = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const projectId = tree.projects[0].id
    const nb = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'Reorder NB' }),
    }).then((r) => r.json())
    const mk = (title: string) =>
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId: nb.id, title }),
      }).then((r) => r.json())
    const a = await mk('Note Alpha')
    const b = await mk('Note Beta')
    return { notebookId: nb.id, a: a.id, b: b.id }
  })

  const order = async () => {
    const tree = await page.evaluate(() => fetch('/api/tree').then((r) => r.json()))
    const nb = tree.projects
      .flatMap((p: { notebooks: unknown[] }) => p.notebooks)
      .find((n: { id: string }) => n.id === ids.notebookId)
    return nb.notes.map((n: { id: string }) => n.id)
  }

  // Initially A before B.
  expect(await order()).toEqual([ids.a, ids.b])

  // Drag Beta onto Alpha -> Beta should land before Alpha.
  await page.reload()
  await page
    .getByRole('link', { name: 'Note Beta' })
    .dragTo(page.getByRole('link', { name: 'Note Alpha' }))
  await expect.poll(order).toEqual([ids.b, ids.a])

  await page.evaluate((id) => fetch('/api/notebooks/' + id, { method: 'DELETE' }), ids.notebookId)
})
