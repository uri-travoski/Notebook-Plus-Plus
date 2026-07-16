// Backup settings: the single global `backup_settings` row, with the backup password and S3
// secret decrypted for internal use and redacted for the API.
import { asc, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { decryptSecret, encryptSecret } from '../crypto'

export const CRON_BY_SCHEDULE: Record<string, string | null> = {
  off: null,
  '2h': '0 */2 * * *',
  '6h': '0 */6 * * *',
  daily: '0 3 * * *',
  weekly: '0 3 * * 0',
}

export type S3Settings = {
  endpoint: string
  region: string
  bucket: string
  forcePathStyle: boolean
  accessKeyId: string
  secretAccessKey: string
}

export type BackupConfig = {
  schedule: string
  retention: number
  includeUploads: boolean
  destination: {
    type: 'local' | 's3'
    localPath: string
    s3: S3Settings
  }
  password: string
}

type Row = typeof schema.backupSettings.$inferSelect

// The settings table holds exactly one row. Return it, creating defaults on first access.
async function loadRow(): Promise<Row> {
  const db = useDb()
  const [existing] = await db
    .select()
    .from(schema.backupSettings)
    .orderBy(asc(schema.backupSettings.id)) // uuidv7 → time-ordered; the earliest row is canonical
    .limit(1)
  if (existing) return existing
  const [created] = await db.insert(schema.backupSettings).values({}).returning()
  return created
}

function decryptOrEmpty(ct: string | null, iv: string | null, tag: string | null): string {
  if (!ct || !iv || !tag) return ''
  try {
    return decryptSecret(ct, iv, tag)
  } catch {
    return ''
  }
}

function rowToConfig(row: Row): BackupConfig {
  return {
    schedule: row.schedule,
    retention: row.retention,
    includeUploads: row.includeUploads,
    destination: {
      type: row.destinationType === 's3' ? 's3' : 'local',
      localPath: row.localPath,
      s3: {
        endpoint: row.s3Endpoint,
        region: row.s3Region,
        bucket: row.s3Bucket,
        forcePathStyle: row.s3ForcePathStyle,
        accessKeyId: row.s3AccessKeyId,
        secretAccessKey: decryptOrEmpty(
          row.s3SecretCiphertext,
          row.s3SecretIv,
          row.s3SecretAuthTag,
        ),
      },
    },
    password: decryptOrEmpty(row.passwordCiphertext, row.passwordIv, row.passwordAuthTag),
  }
}

export async function loadConfig(): Promise<BackupConfig> {
  return rowToConfig(await loadRow())
}

// Redacted view for the API: secrets become '********' (present) or '' (unset).
export async function redactedConfig() {
  const c = await loadConfig()
  return {
    ...c,
    password: c.password ? '********' : '',
    destination: {
      ...c.destination,
      s3: {
        ...c.destination.s3,
        secretAccessKey: c.destination.s3.secretAccessKey ? '********' : '',
      },
    },
  }
}

// Input from the API PUT. Secrets are optional: a value equal to '********' (or omitted) keeps
// the stored secret; any other string replaces it; an empty string clears it.
export type ConfigInput = {
  schedule?: string
  retention?: number
  includeUploads?: boolean
  password?: string
  destination?: {
    type?: string
    localPath?: string
    s3?: Partial<S3Settings>
  }
}

const SCHEDULES = new Set(['off', '2h', '6h', 'daily', 'weekly'])

function encField(next: string, placeholder: string, current: string): string {
  // Undefined arrives as placeholder from the caller when it wants to keep the current value.
  return next === placeholder ? current : next
}

export async function saveConfig(input: ConfigInput): Promise<BackupConfig> {
  const row = await loadRow()
  const current = rowToConfig(row)

  const schedule =
    input.schedule && SCHEDULES.has(input.schedule) ? input.schedule : current.schedule
  const retention =
    Number.isFinite(input.retention) && (input.retention as number) > 0
      ? Math.floor(input.retention as number)
      : current.retention
  const includeUploads =
    typeof input.includeUploads === 'boolean' ? input.includeUploads : current.includeUploads

  const destType = input.destination?.type === 's3' ? 's3' : 'local'
  const localPath = input.destination?.localPath?.trim() ?? current.destination.localPath

  const s3In = input.destination?.s3 ?? {}
  const s3 = {
    endpoint: (s3In.endpoint ?? current.destination.s3.endpoint).trim(),
    region: (s3In.region ?? current.destination.s3.region).trim() || 'auto',
    bucket: (s3In.bucket ?? current.destination.s3.bucket).trim(),
    forcePathStyle:
      typeof s3In.forcePathStyle === 'boolean'
        ? s3In.forcePathStyle
        : current.destination.s3.forcePathStyle,
    accessKeyId: (s3In.accessKeyId ?? current.destination.s3.accessKeyId).trim(),
    secretAccessKey:
      s3In.secretAccessKey === undefined
        ? current.destination.s3.secretAccessKey
        : encField(s3In.secretAccessKey, '********', current.destination.s3.secretAccessKey),
  }

  const nextPassword =
    input.password === undefined
      ? current.password
      : encField(input.password, '********', current.password)

  const s3Secret = s3.secretAccessKey ? encryptSecret(s3.secretAccessKey) : null
  const passwordEnc = nextPassword ? encryptSecret(nextPassword) : null

  await useDb()
    .update(schema.backupSettings)
    .set({
      schedule,
      retention,
      includeUploads,
      destinationType: destType,
      localPath,
      s3Endpoint: s3.endpoint,
      s3Region: s3.region,
      s3Bucket: s3.bucket,
      s3ForcePathStyle: s3.forcePathStyle,
      s3AccessKeyId: s3.accessKeyId,
      s3SecretCiphertext: s3Secret?.ciphertext ?? null,
      s3SecretIv: s3Secret?.iv ?? null,
      s3SecretAuthTag: s3Secret?.authTag ?? null,
      passwordCiphertext: passwordEnc?.ciphertext ?? null,
      passwordIv: passwordEnc?.iv ?? null,
      passwordAuthTag: passwordEnc?.authTag ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.backupSettings.id, row.id))

  return loadConfig()
}
