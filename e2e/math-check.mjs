import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e.message).slice(0, 150)))

await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('Username or email').fill('dev')
await page.getByLabel('Password').fill('notebookpp')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL(/\/$/)

const id = await page.evaluate(async () => {
  const tree = await fetch('/api/tree').then((r) => r.json())
  const nb = tree.projects[0].notebooks[0]
  const doc = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Math' }),
  }).then((r) => r.json())
  await fetch('/api/documents/' + doc.id, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: [{ type: 'math', content: 'e = mc^2' }] }),
  })
  return doc.id
})

await page.goto(base + '/doc/' + id, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
console.log('nb-math blocks:', await page.locator('.nb-math').count())
console.log('katex rendered:', await page.locator('.nb-math-preview .katex').count())
await page.evaluate((d) => fetch('/api/documents/' + d, { method: 'DELETE' }), id)
await browser.close()
