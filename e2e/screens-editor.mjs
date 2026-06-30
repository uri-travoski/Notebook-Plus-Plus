import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://127.0.0.1:3941'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('Username or email').fill('dev')
await page.getByLabel('Password').fill('notebookpp')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL(/\/$/)

const recent = await page.evaluate(() => fetch('/api/documents?view=recent').then((r) => r.json()))
const pageDoc = recent.find((d) => d.type === 'page')
await page.goto(base + '/doc/' + pageDoc.id, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'e2e/artifacts/editor-page.png' })

await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.getByText('Workspace').waitFor()
const nav = page.getByRole('navigation', { name: 'Sidebar' })
const nb = nav.locator('li', { hasText: 'Welcome' }).last()
await nb.getByRole('button', { name: 'More actions' }).first().click()
await page.getByRole('menuitem', { name: 'New note' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'e2e/artifacts/chooser.png' })

await ctx.close()
await browser.close()
console.log('captured')
