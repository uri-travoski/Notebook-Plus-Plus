import { chromium } from '@playwright/test'

const base = process.env.BASE || 'http://192.168.68.53:8090'
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

await page.goto(base + '/login', { waitUntil: 'networkidle' })
await page.getByLabel('Username or email').fill('dev')
await page.getByLabel('Password').fill('notebookpp')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForTimeout(2000)

console.log('after-login URL:', page.url())
console.log(
  'reached Overview:',
  (await page.getByRole('heading', { name: 'Overview' }).count()) > 0,
)

await browser.close()
