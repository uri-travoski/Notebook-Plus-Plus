import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE.error', m.text().slice(0, 260))
})
page.on('pageerror', (e) => console.log('PAGEERROR', String(e.message).slice(0, 260)))

await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('Username or email').fill('dev')
await page.getByLabel('Password').fill('notebookpp')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL(/\/$/)

const recent = await page.evaluate(() => fetch('/api/documents?view=recent').then((r) => r.json()))
const pageDoc = recent.find((d) => d.type === 'page')
await page.goto(base + '/doc/' + pageDoc.id, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
console.log('contenteditable count:', await page.locator('[contenteditable]').count())

await browser.close()
