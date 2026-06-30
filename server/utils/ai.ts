import { generateText, streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { and, asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { decryptSecret } from './crypto'

export type Provider = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'groq'
export type KeyRow = typeof schema.aiKeys.$inferSelect

// Cheap, current defaults per provider; a key can override with its own `model`.
export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o-mini',
}

// One call site for resolving a provider+key+model to a Vercel-AI-SDK model.
// OpenRouter is OpenAI-compatible, so it reuses the OpenAI provider with a baseURL.
export function resolveModel(
  provider: Provider,
  apiKey: string,
  modelId?: string | null,
  baseUrl?: string | null,
) {
  const id = modelId || DEFAULT_MODELS[provider]
  const base = baseUrl ? { baseURL: baseUrl } : {}
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey, ...base })(id)
    case 'openai':
      return createOpenAI({ apiKey, ...base })(id)
    case 'google':
      return createGoogleGenerativeAI({ apiKey, ...base })(id)
    case 'groq':
      return createGroq({ apiKey, ...base })(id)
    case 'openrouter':
      return createOpenAI({ apiKey, baseURL: baseUrl || 'https://openrouter.ai/api/v1' })(id)
  }
}

export async function enabledKeys(userId: string): Promise<KeyRow[]> {
  return useDb()
    .select()
    .from(schema.aiKeys)
    .where(and(eq(schema.aiKeys.userId, userId), eq(schema.aiKeys.enabled, true)))
    .orderBy(asc(schema.aiKeys.priority))
}

export async function markKeyOk(id: string) {
  await useDb()
    .update(schema.aiKeys)
    .set({ lastOkAt: new Date(), lastError: null })
    .where(eq(schema.aiKeys.id, id))
}

export async function markKeyError(id: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  await useDb()
    .update(schema.aiKeys)
    .set({ lastError: msg.slice(0, 300) })
    .where(eq(schema.aiKeys.id, id))
}

// Validate a key with a cheap completion. Returns null on success, else an error message.
export async function validateKey(
  provider: Provider,
  apiKey: string,
  modelId?: string | null,
  baseUrl?: string | null,
): Promise<string | null> {
  try {
    await generateText({
      model: resolveModel(provider, apiKey, modelId, baseUrl),
      prompt: 'Reply with the word ok.',
      maxOutputTokens: 5,
    })
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

// Generic ordered-fallback driver (pure — unit-testable). Calls attempt(key) for each key in
// order; the first that resolves wins. attempt() decides success/failure by throwing.
export async function runFallback<T>(
  keys: KeyRow[],
  attempt: (key: KeyRow) => Promise<T>,
): Promise<T> {
  if (!keys.length) throw createError({ statusCode: 400, statusMessage: 'No AI keys configured.' })
  let lastErr: unknown
  for (const key of keys) {
    try {
      return await attempt(key)
    } catch (e) {
      lastErr = e
      await markKeyError(key.id, e)
    }
  }
  throw createError({
    statusCode: 502,
    statusMessage: `All AI providers failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  })
}

const ACTIONS: Record<string, string> = {
  continue:
    "You continue the user's note naturally where it leaves off. Output only the continuation text — no preamble, no repetition of the existing text.",
  improve:
    'You rewrite the given text to be clearer and better written while preserving meaning. Output only the rewritten text.',
  summarize: 'You summarise the given text concisely. Output only the summary.',
  grammar:
    'You correct spelling and grammar in the given text, preserving meaning and tone. Output only the corrected text.',
  translate:
    'You translate the given text to the language the user requests (default English). Output only the translation.',
  ask: 'You are a helpful writing assistant inside a notes app. Answer clearly and concisely in Markdown-free plain text.',
}

export function systemFor(action: string): string {
  return ACTIONS[action] ?? ACTIONS.ask
}

// Stream a completion to a sink, trying each enabled key in priority order. Falls through to the
// next key as long as nothing has been emitted yet; once text streams, it commits to that key.
export async function streamCompletion(
  userId: string,
  opts: { system: string; prompt: string },
  onDelta: (text: string) => void,
): Promise<void> {
  const keys = await enabledKeys(userId)
  if (!keys.length) throw createError({ statusCode: 400, statusMessage: 'No AI keys configured.' })
  let emitted = false
  let lastErr: unknown
  for (const key of keys) {
    // streamText routes provider errors to onError (it does NOT throw inside textStream), so
    // capture it and re-throw after the stream drains to drive the fallback.
    let streamErr: unknown = null
    try {
      const apiKey = decryptSecret(key.encryptedKey, key.iv, key.authTag)
      const result = streamText({
        model: resolveModel(key.provider as Provider, apiKey, key.model, key.baseUrl),
        system: opts.system,
        prompt: opts.prompt,
        onError: ({ error }) => {
          streamErr = error
        },
      })
      for await (const delta of result.textStream) {
        emitted = true
        onDelta(delta)
      }
      if (streamErr) throw streamErr
      await markKeyOk(key.id)
      return
    } catch (e) {
      lastErr = e
      await markKeyError(key.id, e)
      if (emitted) throw e // already streamed to the client; cannot fall back cleanly
    }
  }
  throw createError({
    statusCode: 502,
    statusMessage: `All AI providers failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  })
}
