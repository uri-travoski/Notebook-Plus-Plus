import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'
import { createPasswordHash } from '../utils/password'
import { defaultPreferences } from '../utils/auth'

const DEFAULT_EMAIL = 'dev@notebookpp.local'
const DEFAULT_USERNAME = 'dev'
const DEFAULT_PASSWORD = 'notebookpp'

function welcomePage() {
  return [
    { type: 'heading', props: { level: 1 }, content: 'Welcome to Notebook++' },
    {
      type: 'paragraph',
      content:
        'This is your self-hosted knowledge base. Create pages and canvases from the sidebar.',
    },
    { type: 'paragraph', content: 'Everything autosaves. Try the slash menu by typing "/".' },
  ]
}

export async function runSeed() {
  const url = process.env.NUXT_DATABASE_URL
  if (!url) throw new Error('NUXT_DATABASE_URL is not set')
  const pool = new pg.Pool({ connectionString: url })
  const db = drizzle(pool, { schema, casing: 'snake_case' })
  try {
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, DEFAULT_EMAIL))
      .limit(1)
    if (existing.length) {
      console.log('Seed: default account already exists, skipping.')
      return
    }

    const passwordHash = await createPasswordHash(DEFAULT_PASSWORD)
    const [user] = await db
      .insert(schema.users)
      .values({
        email: DEFAULT_EMAIL,
        username: DEFAULT_USERNAME,
        passwordHash,
        displayName: 'Dev',
        preferences: defaultPreferences(),
      })
      .returning()

    const [project] = await db
      .insert(schema.projects)
      .values({ userId: user.id, name: 'Getting Started', icon: 'sparkles', position: 'a0' })
      .returning()
    const [notebook] = await db
      .insert(schema.notebooks)
      .values({ projectId: project.id, name: 'Welcome', icon: 'book', position: 'a0' })
      .returning()

    await db.insert(schema.documents).values({
      userId: user.id,
      notebookId: notebook.id,
      title: 'Welcome to Notebook++',
      type: 'page',
      content: welcomePage(),
      searchText:
        'Welcome to Notebook++ This is your self-hosted knowledge base. Create pages and canvases from the sidebar. Everything autosaves. Try the slash menu by typing /.',
      position: 'a0',
    })
    await db.insert(schema.documents).values({
      userId: user.id,
      notebookId: notebook.id,
      title: 'My first canvas',
      type: 'canvas',
      content: { elements: [], appState: {}, files: {} },
      position: 'a1',
    })

    console.log(
      `Seed: created default account -> username "${DEFAULT_USERNAME}" / password "${DEFAULT_PASSWORD}"`,
    )
  } finally {
    await pool.end()
  }
}

await runSeed()
