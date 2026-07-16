// S3-compatible destination (Cloudflare R2, Backblaze B2, MinIO, AWS S3). Objects live under
// the `notebookpp/` key prefix (see [[backups-under-app-folder]]).
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'

import { APP_NAME, BACKUP_EXT, type Destination } from '../shared'

const PREFIX = `${APP_NAME}/`

export type S3Config = {
  endpoint: string
  region: string
  bucket: string
  forcePathStyle: boolean
  accessKeyId: string
  secretAccessKey: string
}

export function createS3Destination(cfg: S3Config): Destination {
  const client = new S3Client({
    endpoint: cfg.endpoint || undefined,
    region: cfg.region || 'auto',
    forcePathStyle: !!cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  })
  const bucket = cfg.bucket

  return {
    kind: 's3',
    location: `s3://${bucket}/${PREFIX}`,
    async put(filePath, name) {
      const upload = new Upload({
        client,
        params: { Bucket: bucket, Key: PREFIX + name, Body: createReadStream(filePath) },
        queueSize: 4,
        partSize: 64 * 1024 * 1024,
      })
      await upload.done()
    },
    async list() {
      const items = []
      let token: string | undefined
      do {
        const res = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }),
        )
        for (const obj of res.Contents ?? []) {
          const name = (obj.Key ?? '').slice(PREFIX.length)
          if (name.endsWith(BACKUP_EXT)) {
            items.push({
              name,
              size: obj.Size ?? 0,
              modifiedAt: obj.LastModified?.toISOString(),
            })
          }
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined
      } while (token)
      return items.sort((a, b) => b.name.localeCompare(a.name))
    },
    async fetch(name, destPath) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: PREFIX + name }))
      await pipeline(res.Body as Readable, createWriteStream(destPath))
    },
    async remove(name) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: PREFIX + name }))
    },
  }
}
