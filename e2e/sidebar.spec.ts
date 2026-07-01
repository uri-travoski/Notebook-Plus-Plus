import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('dev')
  await page.getByLabel('Password').fill('notebookpp')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/$/)
}

test('overview app shell has no serious a11y violations', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Overview' }).waitFor()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  expect(
    serious,
    JSON.stringify(
      serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
      null,
      2,
    ),
  ).toEqual([])
})

test('create a notebook and note from the sidebar', async ({ page }) => {
  await login(page)
  const nav = page.getByRole('navigation', { name: 'Sidebar' })
  const sfx = Date.now().toString(36)

  // Seed a project via API (the New-project button was removed by request), then reload.
  await page.evaluate(
    (sfx) =>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: `Proj ${sfx}` }),
      }),
    sfx,
  )
  await page.reload()
  await nav.getByRole('link', { name: 'Overview' }).waitFor()
  const input = nav.locator('input') // lazy — resolves the current rename input at action time
  const projectRow = nav.locator('li', { hasText: `Proj ${sfx}` }).first()
  await expect(projectRow.getByRole('button', { name: `Proj ${sfx}`, exact: true })).toBeVisible()

  // New notebook via the project's menu
  await projectRow.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'New notebook' }).click()
  await input.waitFor()
  await input.fill(`NB ${sfx}`)
  await input.press('Enter')
  const nbRow = nav.locator('li', { hasText: `NB ${sfx}` }).last()
  await expect(nbRow.getByRole('button', { name: `NB ${sfx}`, exact: true })).toBeVisible()

  // New note via the notebook's menu -> navigates to the editor route
  await nbRow.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'New note' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Page' }).click()
  await expect(page).toHaveURL(/\/doc\//)
  await expect(page.getByLabel('Note title')).toHaveValue('Untitled')

  // Cleanup: delete the probe project via its menu (cascades the notebook + note)
  await page.goto('/')
  await nav.getByRole('link', { name: 'Overview' }).waitFor()
  const row = nav.locator('li', { hasText: `Proj ${sfx}` }).first()
  await row.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Delete project' }).click()
  await expect(nav.getByRole('button', { name: `Proj ${sfx}`, exact: true })).toHaveCount(0)
})

test('move a note to another notebook via the Move dialog', async ({ page }) => {
  await login(page)
  const nav = page.getByRole('navigation', { name: 'Sidebar' })
  const sfx = Date.now().toString(36)

  await page.evaluate(
    (sfx) =>
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: `MP ${sfx}` }),
      }),
    sfx,
  )
  await page.reload()
  await nav.getByRole('link', { name: 'Overview' }).waitFor()
  const input = nav.locator('input') // lazy — resolves the current rename input at action time
  const proj = nav.locator('li', { hasText: `MP ${sfx}` }).first()

  for (const nb of [`A ${sfx}`, `B ${sfx}`]) {
    await proj.getByRole('button', { name: 'More actions' }).first().click()
    await page.getByRole('menuitem', { name: 'New notebook' }).click()
    await input.waitFor()
    await input.fill(nb)
    await input.press('Enter')
    await expect(nav.getByRole('button', { name: nb, exact: true })).toBeVisible()
  }

  // Add a note in notebook A
  const nbA = nav.locator('li', { hasText: `A ${sfx}` }).last()
  await nbA.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'New note' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Page' }).click()
  await expect(page).toHaveURL(/\/doc\//)

  // Move the Untitled note to notebook B
  await page.goto('/')
  await nav.getByRole('link', { name: 'Overview' }).waitFor()
  const noteRow = nav.locator('li', { hasText: 'Untitled' }).last()
  await noteRow.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Move to…' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: `MP ${sfx} / B ${sfx}` })
    .click()

  const nbB = nav.locator('li', { hasText: `B ${sfx}` }).last()
  await expect(nbB.getByText('Untitled')).toBeVisible()

  // cleanup
  await proj.getByRole('button', { name: 'More actions' }).first().click()
  await page.getByRole('menuitem', { name: 'Delete project' }).click()
  await expect(nav.getByRole('button', { name: `MP ${sfx}`, exact: true })).toHaveCount(0)
})
