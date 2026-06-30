/** Pulls a human-readable message out of an $fetch/createError failure. */
export function errorMessage(e: unknown, fallback: string): string {
  const err = e as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }
  return err?.data?.statusMessage || err?.data?.message || err?.statusMessage || fallback
}
