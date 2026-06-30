import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()

async function shot(path, file, width, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height } })
  const page = await ctx.newPage()
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.screenshot({ path: file })
  await ctx.close()
  console.log('shot', file)
}

await shot('/login', 'e2e/artifacts/login-desktop.png', 1600)
await shot('/login', 'e2e/artifacts/login-mobile.png', 375, 720)
await shot('/register', 'e2e/artifacts/register-desktop.png', 1600)
await shot('/forgot', 'e2e/artifacts/forgot-desktop.png', 1600)

// Authed home
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page = await ctx.newPage()
await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('Username or email').fill('dev')
await page.getByLabel('Password').fill('notebookpp')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL(/\/$/)
await page.screenshot({ path: 'e2e/artifacts/home-desktop.png' })
await ctx.close()
console.log('shot e2e/artifacts/home-desktop.png')

await browser.close()
