import {
  scrypt,
  randomBytes,
  timingSafeEqual,
  type BinaryLike,
  type ScryptOptions,
} from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer>

// scrypt params (16MB work: 128 * N * r). Stored alongside the hash so they can
// evolve without breaking existing hashes.
const N = 16384
const r = 8
const p = 1
const KEYLEN = 64

export async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = (await scryptAsync(password, salt, KEYLEN, { N, r, p })) as Buffer
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derived.toString('hex')}`
}

export async function verifyPasswordHash(stored: string, password: string): Promise<boolean> {
  try {
    const [scheme, n, rr, pp, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'scrypt') return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const derived = (await scryptAsync(password, salt, expected.length, {
      N: Number(n),
      r: Number(rr),
      p: Number(pp),
    })) as Buffer
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
