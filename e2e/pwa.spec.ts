import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('PWA manifest is served, linked, and installable-shaped', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)
  const m = await page.evaluate(() => fetch('/manifest.webmanifest').then((r) => r.json()))
  expect(m.name).toBe('Notebook++')
  expect(m.display).toBe('standalone')
  expect(m.theme_color).toBe('#0E9F8E')
  expect(m.icons.length).toBeGreaterThanOrEqual(2)
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('settings hard-loads without a 401 (SSR cookie forwarding)', async ({ page }) => {
  await login(page)
  await page.goto('/settings') // hard navigation -> exercises SSR data loads
  await expect(page.getByRole('heading', { name: 'AI providers' })).toBeVisible()
  await expect(page.getByText('401', { exact: true })).toHaveCount(0)
})

test('no horizontal overflow on a narrow (mobile) viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await login(page)
  await page.getByText('Welcome back').waitFor() // overview subtitle (visible on mobile)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('mobile drawer opens the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await login(page)
  await page.getByLabel('Open menu').click()
  // The drawer aside is the only one with shadow-2xl (desktop sidebar is display:none on mobile).
  const drawer = page.locator('aside.shadow-2xl')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Overview' })).toBeVisible()
})
