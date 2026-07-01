import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

// Create an isolated project + notebook via API (test setup), returning ids + names.
async function setup(page: import('@playwright/test').Page, token: string) {
  return page.evaluate(async (token) => {
    const p = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'SB ' + token }),
    }).then((r) => r.json())
    const nb = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: p.id, name: 'NB ' + token }),
    }).then((r) => r.json())
    return { projectId: p.id as string, notebookId: nb.id as string, nbName: 'NB ' + token }
  }, token)
}

test('note menu: Export note downloads the note as Markdown', async ({ page }) => {
  await login(page)
  const token = 'exp' + Date.now().toString(36)
  const { projectId, notebookId } = await setup(page, token)
  const noteTitle = 'ExportMe ' + token
  await page.evaluate(
    ({ notebookId, noteTitle }) =>
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId, type: 'page', title: noteTitle }),
      }),
    { notebookId, noteTitle },
  )
  await page.reload()

  const row = page.getByRole('link', { name: noteTitle }).locator('..')
  await row.hover()
  await row.getByRole('button').last().click() // the "…" dropdown trigger
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Export note').click(),
  ])
  expect(download.suggestedFilename()).toContain(noteTitle)
  expect(download.suggestedFilename()).toContain('.md')

  await page.evaluate((id) => fetch('/api/projects/' + id, { method: 'DELETE' }), projectId)
})

test('notebook menu: Import note adds a Markdown file as a note', async ({ page }) => {
  await login(page)
  const token = 'imp' + Date.now().toString(36)
  const { projectId, nbName } = await setup(page, token)
  await page.reload()

  // The seeded project has no recent note, so it starts collapsed by default — expand it.
  await page.getByRole('button', { name: 'SB ' + token, exact: true }).click()
  const nbRow = page.getByRole('button', { name: nbName, exact: true }).locator('..')
  await nbRow.hover()
  await nbRow.getByRole('button').last().click() // the "…" dropdown trigger

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Import note').click(),
  ])
  await chooser.setFiles({
    name: 'imported.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Imported Via Sidebar ' + token + '\n\nHello from a file.'),
  })

  await expect(page.getByRole('link', { name: 'Imported Via Sidebar ' + token })).toBeVisible()

  await page.evaluate((id) => fetch('/api/projects/' + id, { method: 'DELETE' }), projectId)
})
