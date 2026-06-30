import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('inline Excalidraw drawing block renders and its scene persists in the document', async ({
  page,
}) => {
  await login(page)
  const scene = JSON.stringify({
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  })
  const id = await page.evaluate(async (scene) => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Inline Drawing' }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + doc.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'drawing', props: { scene } }] }),
    })
    return doc.id as string
  }, scene)

  await page.goto('/doc/' + id)
  await expect(page.locator('.nb-drawing')).toBeVisible()
  await expect(page.locator('.nb-drawing .excalidraw')).toBeVisible() // Excalidraw mounted

  const persisted = await page.evaluate(
    (id) =>
      fetch('/api/documents/' + id)
        .then((r) => r.json())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((d: any) => d.content?.[0]?.props?.scene),
    id,
  )
  expect(String(persisted)).toContain('viewBackgroundColor')

  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), id)
})
