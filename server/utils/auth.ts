import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

/** Raw password-reset token (sent to the user). Only its hash is stored. */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare of two hex strings. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/
export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

export function defaultPreferences() {
  return {
    theme: 'system' as 'system' | 'light' | 'dark',
    bodyFont: 'inter',
    monoFont: 'jetbrains-mono',
    editorWidth: 'normal' as 'normal' | 'wide',
    defaultDocType: 'page' as 'page' | 'canvas',
    dateFormat: 'YYYY-MM-DD',
    markdownShortcuts: true,
    sidebarCollapsed: [] as string[],
  }
}

type SessionUserInput = {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  tokenVersion: number
}

/** Shape stored in the sealed session cookie and exposed to the client. */
export function sessionUser(u: SessionUserInput) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    tokenVersion: u.tokenVersion,
  }
}
