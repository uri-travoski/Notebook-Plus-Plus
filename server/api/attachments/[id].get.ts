import { createReadStream, statSync } from 'node:fs'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { getUserId } from '../../utils/guard'
import { attachmentPath } from '../../utils/storage'

// Streams an attachment back to the browser (behind the user session). Supports HTTP
// Range so <video>/<audio> can seek and play (browsers require 206 for media).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const id = getRouterParam(event, 'id') as string

  const db = useDb()
  const [row] = await db
    .select()
    .from(schema.attachments)
    .where(and(eq(schema.attachments.id, id), eq(schema.attachments.userId, userId)))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Attachment not found.' })

  const path = attachmentPath(row.key)
  let stat
  try {
    stat = statSync(path)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File is missing from storage.' })
  }

  setResponseHeader(event, 'Content-Type', row.contentType)
  setResponseHeader(event, 'Accept-Ranges', 'bytes')
  setResponseHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')

  const range = getRequestHeader(event, 'range')
  const match = range ? /bytes=(\d*)-(\d*)/.exec(range) : null
  if (match) {
    const start = match[1] ? parseInt(match[1], 10) : 0
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stat.size) {
      setResponseStatus(event, 416)
      setResponseHeader(event, 'Content-Range', `bytes */${stat.size}`)
      return ''
    }
    setResponseStatus(event, 206)
    setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${stat.size}`)
    setResponseHeader(event, 'Content-Length', end - start + 1)
    return sendStream(event, createReadStream(path, { start, end }))
  }

  setResponseHeader(event, 'Content-Length', stat.size)
  return sendStream(event, createReadStream(path))
})
