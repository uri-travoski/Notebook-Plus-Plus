import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()

async function login(ctx) {
  const page = await ctx.newPage()
  await page.goto(base + '/login', { waitUntil: 'networkidle' })
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
  return page
}

// Desktop overview (sidebar tree + content)
let ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } })
let page = await login(ctx)
await page.waitForTimeout(500)
await page.screenshot({ path: 'e2e/artifacts/app-overview.png' })
await page.goto(base + '/trash', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
await page.screenshot({ path: 'e2e/artifacts/app-trash.png' })
await ctx.close()

// Mobile (top bar + drawer)
ctx = await browser.newContext({ viewport: { width: 390, height: 800 } })
page = await login(ctx)
await page.waitForTimeout(400)
await page.screenshot({ path: 'e2e/artifacts/app-mobile.png' })
await page.getByLabel('Open menu').click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'e2e/artifacts/app-drawer-mobile.png' })
await ctx.close()

await browser.close()
console.log('screens captured')
