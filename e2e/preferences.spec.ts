import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('preferences: body + code fonts and theme apply to CSS vars and persist on reload', async ({
  page,
}) => {
  await login(page)
  await page.goto('/settings')
  await page.evaluate(() =>
    fetch('/api/me/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyFont: 'merriweather', monoFont: 'fira', theme: 'dark' }),
    }),
  )
  await page.reload()
  await page.waitForTimeout(800) // let the appearance plugin apply saved prefs

  const v = await page.evaluate(() => ({
    sans: getComputedStyle(document.documentElement).getPropertyValue('--font-sans'),
    mono: getComputedStyle(document.documentElement).getPropertyValue('--font-mono'),
    dark: document.documentElement.classList.contains('dark'),
  }))
  expect(v.sans).toContain('Merriweather')
  expect(v.mono).toContain('Fira')
  expect(v.dark).toBe(true)

  // restore the new defaults so the preview/login stay clean
  await page.evaluate(() =>
    fetch('/api/me/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bodyFont: 'noto', monoFont: 'googlecode', theme: 'light' }),
    }),
  )
})

test('change password: wrong current rejected, correct accepted (reverted)', async ({ page }) => {
  await login(page)
  const r = await page.evaluate(async () => {
    const post = (currentPassword: string, newPassword: string) =>
      fetch('/api/me/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      }).then((res) => res.status)
    const wrong = await post('wrong-password', 'whatever123')
    const change = await post('notebookpp', 'tempPass12345')
    const revert = await post('tempPass12345', 'notebookpp') // always restore the seed password
    return { wrong, change, revert }
  })
  expect(r.wrong).toBe(400)
  expect(r.change).toBe(200)
  expect(r.revert).toBe(200)
})
