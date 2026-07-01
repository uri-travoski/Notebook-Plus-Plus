import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { ensureUploadDir } from '../../utils/storage'

// Accepts a multipart upload from the editor's uploadFile handler (image / file /
// video / audio blocks). Stores the bytes on disk under a random key and records the
// attachment row; returns the URL the block embeds.
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const form = await readMultipartFormData(event)
  const file = form?.find((p) => p.name === 'file' && p.filename)
  if (!file || !file.data?.length)
    throw createError({ statusCode: 400, statusMessage: 'No file provided.' })
  if (file.data.length > MAX_BYTES)
    throw createError({ statusCode: 413, statusMessage: 'File too large (max 50 MB).' })

  const documentId = form?.find((p) => p.name === 'documentId')?.data?.toString() || null
  const name = file.filename || 'file'
  const contentType = file.type || 'application/octet-stream'
  const key = randomUUID()

  const dir = await ensureUploadDir()
  await writeFile(join(dir, key), file.data)

  const db = useDb()
  const [row] = await db
    .insert(schema.attachments)
    .values({ userId, documentId, key, name, contentType, size: file.data.length })
    .returning()

  return { id: row.id, url: '/api/attachments/' + row.id, name, contentType, size: row.size }
})
