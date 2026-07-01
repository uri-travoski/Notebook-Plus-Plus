import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('font size preference applies to --reading-font-size', async ({ page }) => {
  await login(page)
  await page.evaluate(() =>
    fetch('/api/me/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fontSize: 20 }),
    }),
  )
  await page.reload()
  await page.waitForTimeout(700)
  const size = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--reading-font-size').trim(),
  )
  expect(size).toBe('20px')
  await page.evaluate(() =>
    fetch('/api/me/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fontSize: 14 }),
    }),
  )
})

test('an existing AI key can be edited (label/model/priority)', async ({ page }) => {
  await login(page)
  const r = await page.evaluate(async () => {
    const add = await fetch('/api/ai/keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        key: 'sk-orig',
        label: 'Orig',
        baseUrl: 'http://127.0.0.1:1/v1',
      }),
    }).then((res) => res.json())
    await fetch('/api/ai/keys/' + add.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'Renamed', model: 'gpt-4o-mini', priority: 3 }),
    })
    const list = await fetch('/api/ai/keys').then((res) => res.json())
    const k = list.find((x: { id: string }) => x.id === add.id)
    await fetch('/api/ai/keys/' + add.id, { method: 'DELETE' })
    return { label: k?.label, model: k?.model, priority: k?.priority }
  })
  expect(r.label).toBe('Renamed')
  expect(r.model).toBe('gpt-4o-mini')
  expect(r.priority).toBe(3)
})

test('a wide database table is horizontally scrollable within the note', async ({ page }) => {
  await login(page)
  const id = await page.evaluate(async () => {
    const t = await fetch('/api/tree').then((r) => r.json())
    const nb = t.projects[0].notebooks[0]
    const d = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Scroll Tbl' }),
    }).then((r) => r.json())
    const cols = Array.from({ length: 9 }, (_, i) => ({
      id: 'c' + i,
      name: 'Col ' + i,
      type: 'text',
    }))
    const db = await fetch('/api/databases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentId: d.id, columns: cols }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + d.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: [{ type: 'databaseTable', props: { databaseId: db.id } }] }),
    })
    return d.id as string
  })
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto('/doc/' + id)
  await expect(page.locator('.nb-db-scroll')).toBeVisible()
  const s = await page.evaluate(() => {
    const el = document.querySelector('.nb-db-scroll') as HTMLElement
    return {
      scrollable: el.scrollWidth > el.clientWidth + 5,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  expect(s.scrollable).toBe(true) // table overflows -> container scrolls
  expect(s.pageOverflow).toBeLessThanOrEqual(0) // and does not push the page wide
  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), id)
})

test('the selection formatting toolbar includes an inline code toggle', async ({ page }) => {
  await login(page)
  const id = await page.evaluate(async () => {
    const t = await fetch('/api/tree').then((r) => r.json())
    const nb = t.projects[0].notebooks[0]
    const d = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Toolbar' }),
    }).then((r) => r.json())
    await fetch('/api/documents/' + d.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'select me', styles: {} }] },
        ],
      }),
    })
    return d.id as string
  })
  await page.goto('/doc/' + id)
  await page.locator('[contenteditable="true"]').first().click()
  await page.getByText('select me').selectText()
  await page.waitForTimeout(600)
  const hasCode = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) =>
      /code/i.test(b.getAttribute('aria-label') || b.getAttribute('title') || ''),
    ),
  )
  expect(hasCode).toBe(true)
  await page.evaluate((id) => fetch('/api/documents/' + id, { method: 'DELETE' }), id)
})
