import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('markdown zip import: top-level folders become notebooks, .md files become notes', async ({
  page,
}) => {
  await login(page)

  const zip = new JSZip()
  zip.file('Alpha/note-a.md', '# Note A\n\nAlpha body one.')
  zip.file('Alpha/note-b.md', '# Note B\n\nAlpha body two.')
  zip.file('Beta/note-c.md', '# Note C\n\nBeta body.')
  zip.file('loose-note.md', '# Loose Note\n\nAt the zip root.')
  const b64 = await zip.generateAsync({ type: 'base64' })

  const projectId = await page.evaluate(async () => {
    const p = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'ZipImport' }),
    }).then((r) => r.json())
    return p.id as string
  })

  const res = await page.evaluate(
    ({ projectId, b64 }) =>
      fetch('/api/import/markdown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId, zip: b64 }),
      }).then((r) => r.json()),
    { projectId, b64 },
  )
  expect(res.created.length).toBe(4)

  const tree = await page.evaluate(() => fetch('/api/tree').then((r) => r.json()))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proj = tree.projects.find((p: any) => p.id === projectId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nbNames = proj.notebooks.map((n: any) => n.name).sort()
  expect(nbNames).toEqual(['Alpha', 'Beta', 'Imported'])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alpha = proj.notebooks.find((n: any) => n.name === 'Alpha')
  expect(alpha.notes.length).toBe(2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(alpha.notes.map((n: any) => n.title).sort()).toEqual(['Note A', 'Note B'])

  await page.evaluate((id) => fetch('/api/projects/' + id, { method: 'DELETE' }), projectId)
})
