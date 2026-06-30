import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const url = process.env.URL || 'http://127.0.0.1:3941/login'
const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()
await page.goto(url, { waitUntil: 'networkidle' })
const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
for (const v of serious) {
  console.log(`\nVIOLATION ${v.id} [${v.impact}]`)
  for (const n of v.nodes) {
    console.log('  node:', n.html)
    for (const c of [...n.any, ...n.all, ...n.none]) console.log('    -', c.message)
  }
}
console.log('\nserious/critical count:', serious.length)
await browser.close()
