import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'
import path from 'path'

export const useGCS = !!process.env.GCS_BUCKET_NAME

// Hardcoded (not env-configurable): every object this app writes lives under this prefix in the
// shared bucket. A literal source constant can't be omitted or mistyped in a deploy config the way
// an env var could, which would otherwise risk writing into the bucket root or genset's namespace.
export const APP_PREFIX = 'tractor' as const

export const ALLOWED_MEDIA_FOLDERS = ['profiles', 'service', 'service-videos', 'commissioning'] as const
export const ALLOWED_REPORT_FOLDERS = ['service-reports', 'commissioning-reports'] as const

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
  expiresMs = 15 * 60 * 1000,
  maxBytes?: number
): Promise<string> {
  const bucket = getBucket()
  const [url] = await bucket.file(gcsPath).getSignedUrl({
    action: 'write',
    expires: Date.now() + expiresMs,
    contentType,
    // Bakes an enforceable upper bound into the signature itself: GCS rejects the PUT unless the
    // client sends this exact header, so a signed URL can't be reused to push an oversized file
    // (multer's fileSize limits don't apply here since this path never touches multer).
    ...(maxBytes ? { extensionHeaders: { 'X-Goog-Content-Length-Range': `0,${maxBytes}` } } : {}),
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
  const filename = `${APP_PREFIX}/${folder}/${randomUUID()}${path.extname(originalname)}`
  const file = bucket.file(filename)
  await file.save(buffer, {
    contentType: mimetype,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=3600' },
  })
  return `https://storage.googleapis.com/${bucket.name}/${filename}`
}
