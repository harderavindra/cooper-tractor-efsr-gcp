import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import path from 'path'
import { useGCS, signedUrl, getUploadSignedUrl, streamFile, gcsPathFromUrl, ALLOWED_MEDIA_FOLDERS, APP_PREFIX } from '../lib/gcs'

const ALLOWED_FOLDERS = ALLOWED_MEDIA_FOLDERS

// Per-folder upload caps enforced via the signed URL itself (X-Goog-Content-Length-Range), since
// multer's fileSize limits never see the direct browser→GCS PUT path.
const MAX_UPLOAD_BYTES: Record<string, number> = {
  profiles: 15 * 1024 * 1024,
  service: 25 * 1024 * 1024,
  'service-videos': 200 * 1024 * 1024,
  commissioning: 25 * 1024 * 1024,
}

function isOwnPath(gcsPath: string): boolean {
  return gcsPath.startsWith(`${APP_PREFIX}/`)
}

export async function sign(req: Request, res: Response) {
  if (!useGCS) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'GCS not configured' } }); return }

  const { paths } = req.body as { paths?: string[] }
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths array required' } }); return
  }
  // Defense-in-depth alongside the bucket's IAM Condition: never mint a read URL for another
  // app's namespace, even if a client bug asked for one.
  const foreign = paths.find(p => !isOwnPath(p))
  if (foreign) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: `path outside ${APP_PREFIX}/ namespace: ${foreign}` } }); return
  }

  try {
    const entries = await Promise.all(
      paths.map(async p => [p, await signedUrl(p)] as [string, string])
    )
    res.json(Object.fromEntries(entries))
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

export async function getUploadUrl(req: Request, res: Response) {
  if (!useGCS) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'GCS not configured' } }); return }

  const { folder, contentType } = req.body as {
    folder?: string; filename?: string; contentType?: string
  }
  const filename: string = (req.body as { filename?: string }).filename || 'upload'
  if (!folder || !(ALLOWED_FOLDERS as readonly string[]).includes(folder) || !contentType) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `folder (got: ${folder}) and contentType are required; folder must be one of ${ALLOWED_FOLDERS.join(', ')}` } }); return
  }

  try {
    const ext = path.extname(filename) || ''
    const gcsPath = `${APP_PREFIX}/${folder}/${randomUUID()}${ext}`
    const maxBytes = MAX_UPLOAD_BYTES[folder]
    const uploadUrl = await getUploadSignedUrl(gcsPath, contentType, undefined, maxBytes)
    const gcsUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsPath}`
    res.json({ uploadUrl, gcsUrl, ...(maxBytes ? { contentLengthRange: `0,${maxBytes}` } : {}) })
  } catch (err) {
    res.status(500).json({ message: (err as Error).message })
  }
}

export async function proxy(req: Request, res: Response) {
  if (!useGCS) { res.status(400).end(); return }

  const rawPath = (req.query.path as string | undefined) ?? ''
  if (!rawPath) { res.status(400).end(); return }

  // Accept a bare GCS path (folder/uuid.jpg) or a full GCS URL
  const gcsPath = rawPath.startsWith('https://storage.googleapis.com/')
    ? gcsPathFromUrl(rawPath)
    : rawPath

  if (!isOwnPath(gcsPath)) { res.status(403).end(); return }

  try {
    const stream = streamFile(gcsPath)
    const ext    = path.extname(gcsPath).toLowerCase().replace('.', '')
    const mime   = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                 : ext === 'png'  ? 'image/png'
                 : ext === 'webp' ? 'image/webp'
                 : ext === 'mp4'  ? 'video/mp4'
                 : ext === 'mov'  ? 'video/quicktime'
                 : ext === 'pdf'  ? 'application/pdf'
                 : 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    stream.on('error', () => res.status(404).end())
    stream.pipe(res)
  } catch {
    res.status(500).end()
  }
}
