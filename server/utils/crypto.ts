import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// AES-256-GCM for provider API keys at rest (§16). The 32-byte key is derived from
// ENCRYPTION_KEY (any length) via SHA-256 so the env value need not be exactly 32 bytes.
// Derive a 32-byte AES key from an arbitrary-length secret (SHA-256).
export function deriveKeyBytes(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

function keyBytes(): Buffer {
  const secret = useRuntimeConfig().encryptionKey || process.env.ENCRYPTION_KEY || ''
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'ENCRYPTION_KEY is not set.' })
  return deriveKeyBytes(secret)
}

// Encrypt under an explicit secret (used by the backup restore to re-key ai_keys from the
// backup's embedded ENCRYPTION_KEY to the running instance's key).
export function encryptSecretWith(
  plain: string,
  secret: string,
): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKeyBytes(secret), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptSecretWith(
  ciphertext: string,
  iv: string,
  authTag: string,
  secret: string,
): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKeyBytes(secret),
    Buffer.from(iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function encryptSecret(plain: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptSecret(ciphertext: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

// A safe preview for the client — never the full secret.
export function maskSecret(plain: string): string {
  if (plain.length <= 8) return '••••'
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`
}
