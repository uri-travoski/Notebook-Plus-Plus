import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e.message).slice(0, 160)))
page.on('requestfinished', async (req) => {
  if (req.method() === 'PATCH' && req.url().includes('/api/documents/')) {
    console.log('PATCH ->', (await req.response())?.status())
  }
})

await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('Username or email').fill('dev')
await page.getByLabel('Password').fill('notebookpp')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL(/\/$/)

const recent = await page.evaluate(() => fetch('/api/documents?view=recent').then((r) => r.json()))
const pageDoc = recent.find((d) => d.type === 'page')
await page.goto(base + '/doc/' + pageDoc.id, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

console.log(
  'editable contenteditable count:',
  await page.locator('[contenteditable="true"]').count(),
)
const marker = 'PERSIST' + Date.now()
const editable = page.locator('[contenteditable="true"]').first()
await editable.click()
await page.keyboard.press('Control+End')
await page.keyboard.type(' ' + marker)
await page.waitForTimeout(600)
console.log(
  'marker typed (pre-reload):',
  (await page.locator('.bn-editor').innerText()).includes(marker),
)
await page.waitForTimeout(2200)
await page.screenshot({ path: 'e2e/artifacts/editor.png' })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
console.log(
  'marker persisted across reload:',
  (
    await page
      .locator('.bn-editor')
      .innerText()
      .catch(() => '')
  ).includes(marker),
)

await ctx.close()
await browser.close()
