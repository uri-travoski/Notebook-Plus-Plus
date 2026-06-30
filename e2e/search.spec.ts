import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

// Create a doc with a unique all-letters token (a single FTS lexeme) so searches are unambiguous.
async function makeDoc(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const token =
      'zzq' +
      Array.from({ length: 6 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26)),
      ).join('')
    const title = 'Quantum Notes ' + token
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + doc.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Superposition note body ' + token, styles: {} }],
          },
        ],
      }),
    })
    return {
      id: doc.id as string,
      title,
      token,
      project: tree.projects[0].name as string,
      notebook: nb.name as string,
    }
  })
}

test('FTS finds by body token and by title, with notebook/project context', async ({ page }) => {
  await login(page)
  const doc = await makeDoc(page)

  const byBody = await page.evaluate(
    (token) => fetch('/api/search?q=' + token).then((r) => r.json()),
    doc.token,
  )
  const hit = byBody.results.find((r: { id: string }) => r.id === doc.id)
  expect(hit).toBeTruthy()
  expect(hit.notebookName).toBe(doc.notebook)
  expect(hit.projectName).toBe(doc.project)

  const byTitle = await page.evaluate(() => fetch('/api/search?q=quantum').then((r) => r.json()))
  expect(byTitle.results.find((r: { id: string }) => r.id === doc.id)).toBeTruthy()

  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), doc.id)
})

test('Cmd-K palette searches and opens a note', async ({ page }) => {
  await login(page)
  const doc = await makeDoc(page)

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Search notes by title or content…').fill(doc.token)
  // Scope to the dialog — the note title also appears in the sidebar tree.
  await expect(dialog.getByText(doc.title)).toBeVisible()
  await page.keyboard.press('Enter')
  await page.waitForURL(new RegExp('/doc/' + doc.id))

  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), doc.id)
})
