import { describe, it, expect, beforeAll } from 'vitest'

// crypto.ts reads useRuntimeConfig() (a Nitro auto-import); stub it for the unit test.
describe('crypto AES-256-GCM', () => {
  let mod: typeof import('../server/utils/crypto')
  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).useRuntimeConfig = () => ({ encryptionKey: 'unit-test-key' })
    mod = await import('../server/utils/crypto')
  })

  it('round-trips a secret', () => {
    const secret = 'sk-super-secret-12345'
    const enc = mod.encryptSecret(secret)
    expect(enc.ciphertext).not.toContain(secret)
    expect(enc.iv).toBeTruthy()
    expect(enc.authTag).toBeTruthy()
    expect(mod.decryptSecret(enc.ciphertext, enc.iv, enc.authTag)).toBe(secret)
  })

  it('fails to decrypt with a tampered auth tag', () => {
    const enc = mod.encryptSecret('abc')
    const badTag = Buffer.from('00'.repeat(16), 'hex').toString('base64')
    expect(() => mod.decryptSecret(enc.ciphertext, enc.iv, badTag)).toThrow()
  })

  it('masks secrets, never revealing the middle', () => {
    expect(mod.maskSecret('sk-abcdefgh1234')).toBe('sk-a••••1234')
    expect(mod.maskSecret('short')).toBe('••••')
  })
})
