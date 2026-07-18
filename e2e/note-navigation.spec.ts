import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('clicking a note in the sidebar shows its content', async ({ page }) => {
  await login(page)

  // Create two distinct page notes via the API under the first notebook.
  const ids = (await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.notebooks[0]
    const docs = await Promise.all([
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'First Note' }),
      }).then((r) => r.json()),
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Second Note' }),
      }).then((r) => r.json()),
    ])
    // Patch distinct content into each note.
    await Promise.all([
      fetch(`/api/documents/${docs[0].id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: [{ type: 'paragraph', props: {}, content: ['FIRST_NOTE_CONTENT'] }],
        }),
      }),
      fetch(`/api/documents/${docs[1].id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: [{ type: 'paragraph', props: {}, content: ['SECOND_NOTE_CONTENT'] }],
        }),
      }),
    ])
    return docs.map((d) => d.id as string)
  })) as [string, string]

  const [id1, id2] = ids

  // Open the first note by clicking the sidebar link.
  await page.getByRole('link', { name: 'First Note' }).click()
  await page.waitForURL(`/doc/${id1}`)
  await expect(page.getByLabel('Note title')).toHaveValue('First Note')
  await expect(page.locator('.bn-editor')).toContainText('FIRST_NOTE_CONTENT')

  // Click the second note in the sidebar.
  await page.getByRole('link', { name: 'Second Note' }).click()
  await page.waitForURL(`/doc/${id2}`)
  await expect(page.getByLabel('Note title')).toHaveValue('Second Note')
  await expect(page.locator('.bn-editor')).toContainText('SECOND_NOTE_CONTENT')

  // Click back to the first note and verify its content is shown again.
  await page.getByRole('link', { name: 'First Note' }).click()
  await page.waitForURL(`/doc/${id1}`)
  await expect(page.getByLabel('Note title')).toHaveValue('First Note')
  await expect(page.locator('.bn-editor')).toContainText('FIRST_NOTE_CONTENT')

  // cleanup
  await page.evaluate(([_id1, _id2]) => {
    fetch(`/api/documents/${_id1}`, { method: 'DELETE' })
    fetch(`/api/documents/${_id2}`, { method: 'DELETE' })
  }, ids)
})
