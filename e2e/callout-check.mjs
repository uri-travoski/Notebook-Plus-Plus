import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
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
    body: JSON.stringify({ notebookId: nb.id, type: 'page', title: 'Callout Test' }),
  }).then((r) => r.json())
  await fetch('/api/documents/' + doc.id, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      content: [
        { type: 'callout', props: { kind: 'warning' }, content: 'Heads up — a warning callout.' },
        { type: 'paragraph', content: 'Body text below the callout.' },
      ],
    }),
  })
  return doc.id
})

await page.goto(base + '/doc/' + id, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
console.log('callout rendered:', await page.locator('.nb-callout').count())
console.log('callout-warning class:', await page.locator('.nb-callout-warning').count())
console.log(
  'callout text:',
  (
    await page
      .locator('.nb-callout')
      .innerText()
      .catch(() => '')
  ).slice(0, 50),
)

// slash menu shows Callout
await page.locator('[contenteditable="true"]').first().click()
await page.keyboard.press('Control+End')
await page.keyboard.press('Enter')
await page.keyboard.type('/callout')
await page.waitForTimeout(700)
console.log(
  'slash "Callout" item visible:',
  (await page.getByText('Callout', { exact: false }).count()) > 0,
)
await page.screenshot({ path: 'e2e/artifacts/callout.png' })

await page.evaluate((d) => fetch('/api/documents/' + d, { method: 'DELETE' }), id)
await ctx.close()
await browser.close()
