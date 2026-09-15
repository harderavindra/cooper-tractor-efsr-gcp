import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'
import path from 'path'

export const useGCS = !!process.env.GCS_BUCKET_NAME

let _bucket: ReturnType<Storage['bucket']> | null = null

function getBucket() {
  if (_bucket) return _bucket

  let storage: Storage
  if (process.env.GCS_CREDENTIALS) {
    try {
      storage = new Storage({ credentials: JSON.parse(process.env.GCS_CREDENTIALS) })
    } catch {
      throw new Error(
        'GCS_CREDENTIALS is not valid JSON. Run: jq -c . service-account.json ' +
        'and paste the single-line output into .env, or use GCS_KEY_FILE=/path/to/file.json instead.'
      )
    }
  } else if (process.env.GCS_KEY_FILE) {
    storage = new Storage({ keyFilename: process.env.GCS_KEY_FILE })
  } else {
    storage = new Storage() // Application Default Credentials
  }

  _bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)
  return _bucket
}

export async function signedUrl(gcsPath: string, expiresMs = 60 * 60 * 1000): Promise<string> {
  const bucket = getBucket()
  const [url] = await bucket.file(gcsPath).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresMs,
  })
  return url
}

export async function getUploadSignedUrl(
  gcsPath: string,
  contentType: string,
  expiresMs = 15 * 60 * 1000
): Promise<string> {
  const bucket = getBucket()
  const [url] = await bucket.file(gcsPath).getSignedUrl({
    action: 'write',
    expires: Date.now() + expiresMs,
    contentType,
  })
  return url
}

export function gcsPathFromUrl(url: string): string {
  return url.split('/').slice(4).join('/')
}

export function streamFile(gcsPath: string) {
  return getBucket().file(gcsPath).createReadStream()
}

export async function getFileMetadata(gcsPath: string) {
  const [meta] = await getBucket().file(gcsPath).getMetadata()
  return meta
}

export async function deleteFromGCS(gcsPath: string): Promise<void> {
  const bucket = getBucket()
  await bucket.file(gcsPath).delete({ ignoreNotFound: true })
}

export async function uploadToGCS(
  buffer: Buffer,
  folder: string,
  originalname: string,
  mimetype: string
): Promise<string> {
  const bucket = getBucket()
  const filename = `${folder}/${randomUUID()}${path.extname(originalname)}`
  const file = bucket.file(filename)
  await file.save(buffer, { contentType: mimetype, resumable: false })
  return `https://storage.googleapis.com/${bucket.name}/${filename}`
}
