import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, open } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encryptFile, decryptFile, validatePassword } from '../server/utils/backup/crypto'

describe('backup archive crypto (.npbk AES-256-GCM)', () => {
  let dir: string
  const plaintext = Buffer.from('notebook contents — db.dump + uploads bundle 🔐'.repeat(500))

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'npbk-crypto-'))
  })
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('round-trips with the correct password', async () => {
    const src = join(dir, 'bundle.tar')
    await writeFile(src, plaintext)
    const enc = join(dir, 'backup.npbk')
    await encryptFile(src, enc, 'correct horse')

    expect(await validatePassword(enc, 'correct horse')).toBe(true)

    const out = join(dir, 'restored.tar')
    await decryptFile(enc, out, 'correct horse')
    expect((await readFile(out)).equals(plaintext)).toBe(true)
  })

  it('rejects a wrong password fast (no data touched) and on full decrypt', async () => {
    const src = join(dir, 'b2.tar')
    await writeFile(src, plaintext)
    const enc = join(dir, 'b2.npbk')
    await encryptFile(src, enc, 'right-password')

    expect(await validatePassword(enc, 'wrong-password')).toBe(false)
    await expect(decryptFile(enc, join(dir, 'nope.tar'), 'wrong-password')).rejects.toThrow(
      /wrong backup password/i,
    )
  })

  it('detects tampering via GCM (auth tag) on decrypt', async () => {
    const src = join(dir, 'b3.tar')
    await writeFile(src, plaintext)
    const enc = join(dir, 'b3.npbk')
    await encryptFile(src, enc, 'pw')

    // Flip a byte well inside the ciphertext body.
    const fd = await open(enc, 'r+')
    const buf = Buffer.alloc(1)
    await fd.read(buf, 0, 1, 200)
    buf[0] ^= 0xff
    await fd.write(buf, 0, 1, 200)
    await fd.close()

    // Password check still passes (header check-block untouched) but full decrypt fails.
    expect(await validatePassword(enc, 'pw')).toBe(true)
    await expect(decryptFile(enc, join(dir, 'nope3.tar'), 'pw')).rejects.toThrow()
  })

  it('rejects a file with a bad magic header', async () => {
    const bogus = join(dir, 'bogus.npbk')
    await writeFile(bogus, Buffer.alloc(200, 7))
    await expect(validatePassword(bogus, 'pw')).rejects.toThrow(/bad magic/i)
  })
})
