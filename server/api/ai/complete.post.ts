import { getUserId } from '../../utils/guard'
import { enabledKeys, streamCompletion, systemFor } from '../../utils/ai'

// Streamed completion. Runs the ordered-fallback engine across the user's enabled keys and
// streams plain-text deltas to the client (the editor writes them in live).
export default defineEventHandler(async (event) => {
  const userId = await getUserId(event)
  const body = await readBody<Record<string, unknown>>(event)
  const action = String(body?.action ?? 'ask')
  const text = String(body?.text ?? '')
  const promptIn = String(body?.prompt ?? '')
  const context = String(body?.context ?? '')

  let prompt: string
  if (action === 'continue')
    prompt = `Continue this note where it leaves off:\n\n${context || text}`
  else if (action === 'ask') prompt = promptIn || text
  else prompt = text // improve / summarize / grammar / translate operate on the given text
  if (!prompt.trim()) throw createError({ statusCode: 400, statusMessage: 'Nothing to send.' })

  // Fail fast with a real status when no keys exist (rather than an inline stream error).
  const keys = await enabledKeys(userId)
  if (!keys.length)
    throw createError({ statusCode: 400, statusMessage: 'Add an AI key in Settings first.' })

  const system = systemFor(action)
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamCompletion(userId, { system, prompt }, (delta) =>
          controller.enqueue(encoder.encode(delta)),
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        controller.enqueue(encoder.encode(`\n[AI error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache')
  return stream
})
