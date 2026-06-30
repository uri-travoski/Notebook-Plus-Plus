import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'

// §24 automated user-simulation. Drives the running app through the real UI: creates 2 projects ×
// 2 notebooks, 10 page notes (each with a 5-row database table built in the grid), and 5 canvas
// mindmaps. Canvas scenes use the documented Excalidraw fallback (a well-formed scene applied
// through the app's own document change path) — the canvas note is still created via the UI.
// Tagged @sim so the normal gate skips it; run with `npm run test:sim`.

const ART = 'e2e/artifacts'
const rid = () => Math.random().toString(36).slice(2, 10)
const rnd = () => Math.floor(Math.random() * 1_000_000)

const PAGE_TOPICS = [
  'Project Kickoff',
  'Research Log',
  'Reading List',
  'Meeting Notes',
  'Sprint Plan',
  'Bug Triage',
  'Content Calendar',
  'Expense Tracker',
  'Habit Tracker',
  'Recipe Box',
]
const CANVAS_THEMES = [
  'Product Strategy',
  'System Architecture',
  'Q4 Roadmap',
  'User Journey',
  'Feature Brainstorm',
]
// Rotating extra block so several block types get exercised across the ten notes. Uses
// keyboard-reliable markdown blocks that exit cleanly (callout + code blocks have their own
// dedicated specs; driving their cursor-exit here is brittle).
const ROTATING = ['checklist', 'quote', 'bullet', 'numbered'] as const

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

// Test hygiene (not content injection): remove prior sim projects so re-runs start clean.
async function cleanup(page: Page) {
  await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    for (const p of tree.projects as { id: string; name: string }[]) {
      if (p.name === 'Workspace' || p.name === 'Personal') {
        await fetch('/api/projects/' + p.id, { method: 'DELETE' })
      }
    }
  })
}

const renameInput = (page: Page) => page.locator('input.border-primary')

async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'New project' }).click()
  await renameInput(page).fill(name)
  await renameInput(page).press('Enter')
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
}

async function createNotebook(page: Page, projectName: string, nbName: string) {
  const project = page.getByRole('button', { name: projectName, exact: true })
  await project.locator('..').getByRole('button', { name: 'Add notebook' }).click()
  await renameInput(page).fill(nbName)
  await renameInput(page).press('Enter')
  await expect(page.getByRole('button', { name: nbName, exact: true })).toBeVisible()
}

async function createNote(page: Page, nbName: string, type: 'Page' | 'Canvas'): Promise<string> {
  const before = page.url()
  const nb = page.getByRole('button', { name: nbName, exact: true })
  await nb.locator('..').getByRole('button', { name: 'Add note' }).click()
  // The chooser tiles' accessible name is "Page Write with…" — substring match, scoped to the
  // modal ('Canvas' would otherwise collide with canvas note titles in the sidebar).
  await page.getByRole('dialog').getByRole('button', { name: type }).click()
  // Wait for a NEW /doc/ url — matching just /doc/ resolves instantly if already on a doc page.
  await page.waitForURL((url) => url.href.includes('/doc/') && url.href !== before)
  return page.url().split('/doc/')[1]
}

async function typeRotating(page: Page, kind: (typeof ROTATING)[number], n: number) {
  const prefix =
    kind === 'checklist' ? '[] ' : kind === 'quote' ? '> ' : kind === 'bullet' ? '- ' : '1. '
  await page.keyboard.type(prefix)
  await page.keyboard.type(`Key point ${n}`)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter') // empty item -> back to a plain paragraph
}

async function buildTable(page: Page) {
  await expect(page.locator('.nb-db-table')).toBeVisible()
  // Start with 1 column; add 4 more for 5 total.
  for (let i = 0; i < 4; i++) {
    await page.locator('.nb-db-addcol button').click()
    await expect(page.locator('.nb-db-th')).toHaveCount(i + 2)
  }
  const cols: [string, string, string][] = [
    ['Name', 'text', ''],
    ['Status', 'select', 'Todo, Doing, Done'],
    ['Priority', 'select', 'Low, Med, High'],
    ['Due', 'date', ''],
    ['Done', 'checkbox', ''],
  ]
  for (let i = 0; i < cols.length; i++) {
    const [name, type, options] = cols[i]
    const th = page.locator('.nb-db-th').nth(i)
    await th.locator('.nb-db-coltype').selectOption(type)
    if (options) {
      await th.locator('.nb-db-coloptions').fill(options)
      await th.locator('.nb-db-coloptions').blur()
    }
    await th.locator('.nb-db-colname').fill(name)
    await th.locator('.nb-db-colname').blur()
  }

  const rows = [
    { Name: 'Draft outline', Status: 'Done', Priority: 'High', Due: '2026-07-05', Done: true },
    { Name: 'Collect sources', Status: 'Doing', Priority: 'Med', Due: '2026-07-08', Done: false },
    { Name: 'Review with team', Status: 'Todo', Priority: 'High', Due: '2026-07-10', Done: false },
    { Name: 'Publish v1', Status: 'Todo', Priority: 'Low', Due: '2026-07-14', Done: false },
    { Name: 'Retro notes', Status: 'Doing', Priority: 'Med', Due: '2026-07-18', Done: true },
  ]
  for (let r = 0; r < rows.length; r++) {
    await page.locator('.nb-db-addrow').click()
    await expect(page.locator('.nb-db-table tbody tr')).toHaveCount(r + 1)
    const row = page.locator('.nb-db-table tbody tr').nth(r)
    const data = rows[r]
    await row.locator('[data-col="Name"]').fill(data.Name)
    await row.locator('[data-col="Name"]').blur()
    await row.locator('[data-col="Status"]').selectOption(data.Status)
    await row.locator('[data-col="Priority"]').selectOption(data.Priority)
    await row.locator('[data-col="Due"]').fill(data.Due)
    if (data.Done) await row.locator('[data-col="Done"]').check()
  }
}

// Documented Excalidraw fallback: a well-formed, labeled mindmap scene.
function makeMindmap(theme: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (p: any) => ({
    id: rid(),
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: rnd(),
    version: 1,
    versionNonce: rnd(),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...p,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textEl = (p: any) =>
    base({
      type: 'text',
      fontSize: 20,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 16,
      containerId: null,
      lineHeight: 1.25,
      originalText: p.text,
      ...p,
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const els: any[] = []
  const cx = 520
  const cy = 360
  els.push(
    base({
      type: 'ellipse',
      x: cx - 110,
      y: cy - 55,
      width: 220,
      height: 110,
      backgroundColor: '#e3f4f1',
    }),
  )
  els.push(textEl({ text: theme, x: cx - 100, y: cy - 14, width: 200, height: 28 }))
  els.push(
    textEl({
      text: `Mindmap: ${theme}`,
      x: cx - 140,
      y: 110,
      width: 280,
      height: 34,
      fontSize: 28,
    }),
  )
  const children = ['Goals', 'Risks', 'People', 'Timeline', 'Resources']
  const radius = 260
  for (let i = 0; i < children.length; i++) {
    const a = (Math.PI * 2 * i) / children.length - Math.PI / 2
    const x = cx + Math.cos(a) * radius
    const y = cy + Math.sin(a) * radius
    els.push(
      base({
        type: 'rectangle',
        x: x - 80,
        y: y - 30,
        width: 160,
        height: 60,
        backgroundColor: '#eef2f7',
      }),
    )
    els.push(
      textEl({ text: children[i], x: x - 70, y: y - 12, width: 140, height: 24, fontSize: 16 }),
    )
    els.push(
      base({
        type: 'arrow',
        x: cx,
        y: cy,
        width: x - cx,
        height: y - cy,
        points: [
          [0, 0],
          [x - cx, y - cy],
        ],
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        roundness: null,
      }),
    )
  }
  els.push(
    textEl({ text: 'Note: revisit weekly', x: 140, y: 620, width: 220, height: 22, fontSize: 14 }),
  )
  els.push(textEl({ text: 'Owner: Dev', x: 760, y: 620, width: 160, height: 22, fontSize: 14 }))
  return { elements: els, appState: { viewBackgroundColor: '#ffffff' }, files: {} }
}

test('@sim §24 user-simulation: 10 page notes with tables + 5 canvas mindmaps', async ({
  page,
}) => {
  test.setTimeout(1_200_000)
  page.setDefaultTimeout(20_000) // fail a stuck step fast instead of hanging the whole run
  const NP = process.env.SIM_SMOKE ? 1 : 10
  const NC = process.env.SIM_SMOKE ? 1 : 5
  fs.mkdirSync(ART, { recursive: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any[] = []

  await login(page)
  await cleanup(page)
  await page.reload()

  // --- Step 0: structure ---
  await createProject(page, 'Workspace')
  await createProject(page, 'Personal')
  const notebooks = [
    ['Workspace', 'Planning'],
    ['Workspace', 'Research'],
    ['Personal', 'Journal'],
    ['Personal', 'Hobbies'],
  ]
  for (const [proj, nb] of notebooks) await createNotebook(page, proj, nb)

  // --- Step 1: 10 page notes, each with a 5-row table ---
  for (let i = 0; i < NP; i++) {
    const nn = String(i + 1).padStart(2, '0')
    const topic = PAGE_TOPICS[i]
    const nbName = notebooks[i % 4][1]
    const projName = notebooks[i % 4][0]
    const title = `Note ${nn} — ${topic}`
    const heading = `${topic} overview`

    const id = await createNote(page, nbName, 'Page')
    await page.getByLabel('Note title').fill(title)

    const ed = page.locator('[contenteditable="true"]').first()
    await ed.click()
    await page.keyboard.type('## ')
    await page.keyboard.type(heading)
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Working notes for ${topic.toLowerCase()}.`)
    await page.keyboard.press('Enter')
    await typeRotating(page, ROTATING[i % 4], i + 1)
    // fresh block, then the table
    await page.keyboard.type('/database')
    await page.waitForTimeout(500)
    await page.keyboard.press('Enter')
    await buildTable(page)

    await page.waitForTimeout(2000) // content autosave
    await page.goto('/doc/' + id)
    await expect(page.getByLabel('Note title')).toHaveValue(title)
    await expect(page.getByText(heading)).toBeVisible()
    await expect(page.locator('.nb-db-table tbody tr')).toHaveCount(5)
    await page.locator('.nb-db-table').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${ART}/note-${nn}.png`, fullPage: true })
    summary.push({ kind: 'page', title, project: projName, notebook: nbName, rows: 5 })
  }

  // --- Step 2: 5 canvas mindmaps (Excalidraw fallback) ---
  for (let i = 0; i < NC; i++) {
    const nn = String(i + 1).padStart(2, '0')
    const theme = CANVAS_THEMES[i]
    const nbName = notebooks[i % 4][1]
    const projName = notebooks[i % 4][0]
    const title = `Canvas ${nn} — Mindmap: ${theme}`

    const id = await createNote(page, nbName, 'Canvas')
    await page.getByLabel('Canvas title').fill(title)
    await page.waitForTimeout(800)

    // Documented fallback: apply a well-formed scene via the app's document change path.
    const scene = makeMindmap(theme)
    await page.evaluate(
      ({ id, scene, title }) =>
        fetch('/api/documents/' + id, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: scene, title }),
        }),
      { id, scene, title },
    )

    await page.goto('/doc/' + id)
    await expect(page.locator('.excalidraw')).toBeVisible()
    const count = await page.evaluate(
      (id) =>
        fetch('/api/documents/' + id)
          .then((r) => r.json())
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((d: any) => (Array.isArray(d.content?.elements) ? d.content.elements.length : 0)),
      id,
    )
    expect(count).toBeGreaterThanOrEqual(18)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ART}/canvas-${nn}.png`, fullPage: true })
    summary.push({
      kind: 'canvas',
      title,
      project: projName,
      notebook: nbName,
      elements: count,
      fallback: true,
    })
  }

  // --- Step 3: verify counts survive a fresh reload ---
  await page.goto('/')
  const counts = await page.evaluate(async () => {
    const tree = await fetch('/api/tree').then((r) => r.json())
    const wanted = ['Planning', 'Research', 'Journal', 'Hobbies']
    let pages = 0
    let canvases = 0
    for (const p of tree.projects as {
      name: string
      notebooks: { name: string; notes: { type: string }[] }[]
    }[]) {
      for (const nb of p.notebooks) {
        if (!wanted.includes(nb.name)) continue
        for (const note of nb.notes) {
          if (note.type === 'canvas') canvases++
          else pages++
        }
      }
    }
    return { pages, canvases }
  })
  expect(counts.pages).toBe(NP)
  expect(counts.canvases).toBe(NC)

  fs.writeFileSync(
    `${ART}/simulation-summary.json`,
    JSON.stringify({ counts, items: summary }, null, 2),
  )
})
