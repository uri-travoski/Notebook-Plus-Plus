import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const DEV_USER = 'dev'
const DEV_PASS = 'notebookpp'

test('unauthenticated visit redirects to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('login page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
})

test('sign in with the seeded account, then log out', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill(DEV_USER)
  await page.getByLabel('Password').fill(DEV_PASS)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.screenshot({ path: 'e2e/artifacts/home-authed.png', fullPage: true })

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('wrong password shows an error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill(DEV_USER)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText(/incorrect username or password/i)).toBeVisible()
})

test('register a fresh account lands signed in', async ({ page }) => {
  const suffix = Date.now().toString(36)
  await page.goto('/register')
  await page.getByLabel('Email').fill(`u_${suffix}@example.com`)
  await page.getByLabel('Username').fill(`u_${suffix}`)
  await page.getByLabel('Password').fill('a-strong-pass-123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(`u_${suffix}`, { exact: true })).toBeVisible()
})

test('forgot password shows a generic confirmation', async ({ page }) => {
  await page.goto('/forgot')
  await page.getByLabel('Email').fill('dev@notebookpp.local')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByRole('status')).toContainText(/reset link is on its way/i)
  await page.screenshot({ path: 'e2e/artifacts/forgot.png', fullPage: true })
})
