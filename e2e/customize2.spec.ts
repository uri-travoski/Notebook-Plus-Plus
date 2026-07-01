import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

async function setup(page: import('@playwright/test').Page, token: string) {
  return page.evaluate(async (token) => {
    const p = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'C2 ' + token }),
    }).then((r) => r.json())
    const nb = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: p.id, name: 'NB ' + token }),
    }).then((r) => r.json())
    return { projectId: p.id as string, notebookId: nb.id as string, nbName: 'NB ' + token }
  }, token)
}

test('in-block callout picker changes the callout type', async ({ page }) => {
  await login(page)
  const id = await page.evaluate(async () => {
    const t = await fetch('/api/tree').then((r) => r.json())
    const nb = t.projects[0].notebooks[0]
    const d = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'CalloutConv' }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + d.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'callout', props: { kind: 'info' }, content: 'a callout' }],
      }),
    })
    return d.id as string
  })
  await page.goto('/doc/' + id)
  await expect(page.locator('.nb-callout-info')).toBeVisible()
  // The in-block type picker (replaced the non-working formatting-toolbar dropdown).
  await page.locator('.nb-callout-kind').selectOption('warning')
  await expect(page.locator('.nb-callout-warning')).toBeVisible()
  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), id)
})

test('notebook menu: New canvas creates a canvas note', async ({ page }) => {
  await login(page)
  const { projectId, nbName } = await setup(page, 'nc' + Date.now().toString(36))
  await page.reload()
  const nbRow = page.getByRole('button', { name: nbName, exact: true }).locator('..')
  await nbRow.hover()
  await nbRow.getByRole('button').last().click() // "…" menu
  await page.getByText('New canvas').click()
  await page.waitForURL(/\/doc\//)
  await expect(page.getByLabel('Canvas title')).toBeVisible() // canvas doc chrome
  await page.evaluate((id) => fetch('/api/projects/' + id, { method: 'DELETE' }), projectId)
})

test('canvas note menu: Export canvas downloads a .excalidraw file', async ({ page }) => {
  await login(page)
  const { projectId, notebookId } = await setup(page, 'ex' + Date.now().toString(36))
  const title = 'MyCanvas'
  await page.evaluate(
    ({ notebookId, title }) =>
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId, type: 'canvas', title }),
      }),
    { notebookId, title },
  )
  await page.reload()
  const row = page.getByRole('link', { name: title }).locator('..')
  await row.hover()
  await row.getByRole('button').last().click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('Export canvas').click(),
  ])
  expect(download.suggestedFilename()).toBe(title + '.excalidraw')
  await page.evaluate((id) => fetch('/api/projects/' + id, { method: 'DELETE' }), projectId)
})
