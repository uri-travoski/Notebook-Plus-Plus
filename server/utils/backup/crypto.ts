// Streaming AES-256-GCM encryption for Notebook++ backup archives (.npbk).
//
// File layout (all lengths fixed):
//   magic 'NPBK1' (5) | salt (16) | checkIv (12) | checkTag (16) |
//   checkCiphertext (16) | dataIv (12) | ciphertext (...) | dataTag (16)
//
// The "check" block is a fixed plaintext encrypted with the same key — it lets us reject a
// wrong password in milliseconds without touching any data, long before a restore does
// anything destructive. GCM authenticates the whole file, so tampering/corruption fails to
// decrypt rather than restoring garbage. The key is scrypt-derived from the backup password,
// so this is independent of the app's ENCRYPTION_KEY: a .npbk is only recoverable with its
// password.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

const MAGIC = Buffer.from('NPBK1')
const CHECK_PLAINTEXT = Buffer.from('notebookpp-check') // 16 bytes
const SCRYPT_OPTS = { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }
const HEADER_LEN = MAGIC.length + 16 + 12 + 16 + CHECK_PLAINTEXT.length + 12 // 77
const TAG_LEN = 16

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, SCRYPT_OPTS)
}

export async function encryptFile(
  srcPath: string,
  destPath: string,
  password: string,
): Promise<void> {
  const salt = randomBytes(16)
  const key = deriveKey(password, salt)

  const checkIv = randomBytes(12)
  const checkCipher = createCipheriv('aes-256-gcm', key, checkIv)
  const checkCt = Buffer.concat([checkCipher.update(CHECK_PLAINTEXT), checkCipher.final()])
  const checkTag = checkCipher.getAuthTag()

  const dataIv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, dataIv)

  const out = createWriteStream(destPath)
  out.write(Buffer.concat([MAGIC, salt, checkIv, checkTag, checkCt, dataIv]))
  await pipeline(createReadStream(srcPath), cipher, out, { end: false })
  await new Promise<void>((resolve, reject) => {
    // node's WriteStream.end() callback takes no error arg — surface write errors via 'error'.
    out.on('error', reject)
    out.end(cipher.getAuthTag(), () => resolve())
  })
}

type Header = {
  salt: Buffer
  checkIv: Buffer
  checkTag: Buffer
  checkCt: Buffer
  dataIv: Buffer
}

async function readHeader(path: string): Promise<Header> {
  const fd = await open(path, 'r')
  try {
    const header = Buffer.alloc(HEADER_LEN)
    await fd.read(header, 0, HEADER_LEN, 0)
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error('Not a Notebook++ backup file (bad magic).')
    }
    let off = MAGIC.length
    const salt = header.subarray(off, (off += 16))
    const checkIv = header.subarray(off, (off += 12))
    const checkTag = header.subarray(off, (off += 16))
    const checkCt = header.subarray(off, (off += CHECK_PLAINTEXT.length))
    const dataIv = header.subarray(off, (off += 12))
    return { salt, checkIv, checkTag, checkCt, dataIv }
  } finally {
    await fd.close()
  }
}

// Fast password check against the header check block only.
export async function validatePassword(path: string, password: string): Promise<boolean> {
  const { salt, checkIv, checkTag, checkCt } = await readHeader(path)
  const key = deriveKey(password, salt)
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, checkIv)
    decipher.setAuthTag(checkTag)
    const plain = Buffer.concat([decipher.update(checkCt), decipher.final()])
    return plain.equals(CHECK_PLAINTEXT)
  } catch {
    return false
  }
}

// Full decrypt with GCM integrity verification (throws on tamper/corruption/wrong password).
export async function decryptFile(
  srcPath: string,
  destPath: string,
  password: string,
): Promise<void> {
  if (!(await validatePassword(srcPath, password))) {
    throw new Error('Wrong backup password.')
  }
  const { salt, dataIv } = await readHeader(srcPath)
  const key = deriveKey(password, salt)
  const { size } = await stat(srcPath)
  const dataEnd = size - TAG_LEN

  const fd = await open(srcPath, 'r')
  const tag = Buffer.alloc(TAG_LEN)
  await fd.read(tag, 0, TAG_LEN, dataEnd)
  await fd.close()

  const decipher = createDecipheriv('aes-256-gcm', key, dataIv)
  decipher.setAuthTag(tag)
  await pipeline(
    createReadStream(srcPath, { start: HEADER_LEN, end: dataEnd - 1 }),
    decipher,
    createWriteStream(destPath),
  )
}
