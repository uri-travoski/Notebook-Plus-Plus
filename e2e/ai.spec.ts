import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('AI keys: add, mask, validate-records-error, toggle, delete', async ({ page }) => {
  await login(page)
  const r = await page.evaluate(async () => {
    // baseUrl points nowhere -> validation fails fast (no external dependency), key still saved.
    const add = await fetch('/api/ai/keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        key: 'sk-bogus-key-abcdef123456',
        label: 'Test',
        baseUrl: 'http://127.0.0.1:1/v1',
      }),
    }).then((res) => res.json())

    const list1 = await fetch('/api/ai/keys').then((res) => res.json())
    const mine = list1.find((k: { id: string }) => k.id === add.id)

    await fetch('/api/ai/keys/' + add.id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    })
    const list2 = await fetch('/api/ai/keys').then((res) => res.json())
    const toggled = list2.find((k: { id: string }) => k.id === add.id)

    const del = await fetch('/api/ai/keys/' + add.id, { method: 'DELETE' }).then((res) =>
      res.json(),
    )
    const list3 = await fetch('/api/ai/keys').then((res) => res.json())

    return {
      valid: add.valid,
      preview: mine?.preview as string,
      provider: mine?.provider as string,
      hasError: !!mine?.lastError,
      enabledAfter: toggled?.enabled,
      del,
      gone: !list3.find((k: { id: string }) => k.id === add.id),
    }
  })

  expect(r.valid).toBe(false) // bogus endpoint -> validation fails
  expect(r.hasError).toBe(true)
  expect(r.provider).toBe('openai')
  expect(r.preview).not.toContain('bogus') // masked, never the plaintext
  expect(r.preview).toContain('••')
  expect(r.enabledAfter).toBe(false)
  expect(r.del.ok).toBe(true)
  expect(r.gone).toBe(true)
})

test('AI complete returns 400 when no key is configured', async ({ page }) => {
  await login(page)
  const status = await page.evaluate(async () => {
    const res = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'ask', prompt: 'hi' }),
    })
    return res.status
  })
  expect(status).toBe(400)
})
