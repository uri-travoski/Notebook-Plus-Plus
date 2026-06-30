import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('canvas renders Excalidraw; a drawn shape saves and persists across reload', async ({
  page,
}) => {
  await login(page)

  const id = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const nb = tree.projects[0].notebooks[0]
    const doc = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notebookId: nb.id, type: 'canvas', title: 'Canvas Test' }),
    }).then((r) => r.json())
    return doc.id as string
  })

  await page.goto('/doc/' + id)
  const canvas = page.locator('.excalidraw canvas').first()
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(1500)

  // Focus the canvas, choose the rectangle tool ('r'), and drag to draw.
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.keyboard.press('r')
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.65, { steps: 12 })
  await page.mouse.up()

  const elementCount = () =>
    page.evaluate(async (docId) => {
      const d = await fetch('/api/documents/' + docId).then((r) => r.json())
      return (d.content?.elements?.length as number) ?? 0
    }, id)

  await expect.poll(elementCount, { timeout: 10000 }).toBeGreaterThan(0)

  await page.reload()
  await expect.poll(elementCount, { timeout: 8000 }).toBeGreaterThan(0)

  await page.evaluate((docId) => fetch('/api/documents/' + docId, { method: 'DELETE' }), id)
})
