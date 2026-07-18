import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('notes open in tabs, switch, and close correctly', async ({ page }) => {
  await login(page)

  // Create 3 notes via the API.
  const ids = (await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.notebooks[0]
    const docs = await Promise.all([
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Tab Note A' }),
      }).then((r) => r.json()),
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Tab Note B' }),
      }).then((r) => r.json()),
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Tab Note C' }),
      }).then((r) => r.json()),
    ])
    return docs.map((d) => d.id as string)
  })) as [string, string, string]

  const [idA, idB, idC] = ids

  // Helper: SPA navigation (preserves useState — page.goto would reset session state)
  async function spaNavigate(path: string) {
    await page.evaluate((p) => {
      history.pushState({}, '', p)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, path)
  }

  // Navigate to note A → 1 tab, active
  await page.goto(`/doc/${idA}`)
  await expect(page.getByRole('tab', { name: /Tab Note A/ })).toHaveCount(1)
  await expect(page.getByRole('tab', { name: /Tab Note A/ })).toHaveAttribute('aria-selected', 'true')

  // Navigate to note B → 2 tabs, B active
  await spaNavigate(`/doc/${idB}`)
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(2)
  await expect(page.getByRole('tab', { name: /Tab Note B/ })).toHaveAttribute('aria-selected', 'true')

  // Navigate to note C → 3 tabs, C active
  await spaNavigate(`/doc/${idC}`)
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(3)
  await expect(page.getByRole('tab', { name: /Tab Note C/ })).toHaveAttribute('aria-selected', 'true')

  // Navigate to note A again → still 3 tabs, A active (no duplicate)
  await spaNavigate(`/doc/${idA}`)
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(3)
  await expect(page.getByRole('tab', { name: /Tab Note A/ })).toHaveAttribute('aria-selected', 'true')

  // Click tab B → URL changes, B active
  await page.getByRole('tab', { name: /Tab Note B/ }).click()
  await expect(page).toHaveURL(`/doc/${idB}`)
  await expect(page.getByRole('tab', { name: /Tab Note B/ })).toHaveAttribute('aria-selected', 'true')

  // Navigate to Overview (/) → tab bar still shows 3 tabs, none active
  await spaNavigate('/')
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(3)
  await expect(page.getByRole('tablist').getByRole('tab', { selected: true })).toHaveCount(0)

  // Click tab C → navigates to /doc/idC, C active
  await page.getByRole('tab', { name: /Tab Note C/ }).click()
  await expect(page).toHaveURL(`/doc/${idC}`)
  await expect(page.getByRole('tab', { name: /Tab Note C/ })).toHaveAttribute('aria-selected', 'true')

  // Close tab C (active) → navigates to previous tab (B)
  await page.getByRole('tab', { name: /Tab Note C/ }).getByRole('button', { name: 'Close tab' }).click()
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(2)

  // Close tab A (non-active) → stays on current page, 1 tab remains
  await page.getByRole('tab', { name: /Tab Note A/ }).getByRole('button', { name: 'Close tab' }).click()
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveCount(1)

  // Close last tab → navigates to /
  await page.getByRole('tab').getByRole('button', { name: 'Close tab' }).click()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page).toHaveURL('/')

  // cleanup
  await page.evaluate(([_idA, _idB, _idC]) => {
    fetch(`/api/documents/${_idA}`, { method: 'DELETE' })
    fetch(`/api/documents/${_idB}`, { method: 'DELETE' })
    fetch(`/api/documents/${_idC}`, { method: 'DELETE' })
  }, ids)
})
