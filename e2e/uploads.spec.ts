import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

// A 1x1 PNG (70 bytes) exercised through the attachment store.
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

test('attachments: upload returns a URL, serves the bytes, and supports Range', async ({
  page,
}) => {
  await login(page)
  const r = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const fd = new FormData()
    fd.append('file', new Blob([bytes], { type: 'image/png' }), 'dot.png')
    const post = await fetch('/api/attachments', { method: 'POST', body: fd })
    const meta = await post.json()
    const get = await fetch(meta.url)
    const buf = new Uint8Array(await get.arrayBuffer())
    const range = await fetch(meta.url, { headers: { Range: 'bytes=0-9' } })
    return {
      postStatus: post.status,
      url: meta.url,
      getStatus: get.status,
      ct: get.headers.get('content-type'),
      len: buf.length,
      origLen: bytes.length,
      rangeStatus: range.status,
      contentRange: range.headers.get('content-range'),
    }
  }, PNG)

  expect(r.postStatus).toBe(200)
  expect(r.url).toMatch(/^\/api\/attachments\//)
  expect(r.getStatus).toBe(200)
  expect(r.ct).toBe('image/png')
  expect(r.len).toBe(r.origLen)
  expect(r.rangeStatus).toBe(206)
  expect(r.contentRange).toMatch(/^bytes 0-9\/\d+$/)
})

test('attachments: an unknown id is 404', async ({ page }) => {
  await login(page)
  const status = await page.evaluate(async () => {
    const res = await fetch('/api/attachments/00000000-0000-7000-8000-000000000000')
    return res.status
  })
  expect(status).toBe(404)
})
