import { describe, it, expect } from 'vitest'
import { createPasswordHash, verifyPasswordHash } from '../server/utils/password'
import {
  hashToken,
  safeEqualHex,
  generateResetToken,
  isValidEmail,
  isValidUsername,
} from '../server/utils/auth'

describe('password hashing', () => {
  it('round-trips a correct password', async () => {
    const hash = await createPasswordHash('correct horse battery staple')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPasswordHash(hash, 'correct horse battery staple')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await createPasswordHash('s3cret-password')
    expect(await verifyPasswordHash(hash, 's3cret-passwerd')).toBe(false)
  })

  it('fails closed on a malformed hash', async () => {
    expect(await verifyPasswordHash('not-a-hash', 'whatever')).toBe(false)
  })
})

describe('reset tokens', () => {
  it('hashes deterministically and compares in constant time', () => {
    const token = generateResetToken()
    expect(token).toHaveLength(64)
    const a = hashToken(token)
    const b = hashToken(token)
    expect(a).toBe(b)
    expect(safeEqualHex(a, b)).toBe(true)
    expect(safeEqualHex(a, hashToken('different'))).toBe(false)
  })
})

describe('validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('nope')).toBe(false)
  })
  it('validates usernames', () => {
    expect(isValidUsername('dev')).toBe(true)
    expect(isValidUsername('a b')).toBe(false)
    expect(isValidUsername('xy')).toBe(false)
  })
})
