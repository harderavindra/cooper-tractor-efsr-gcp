import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import path from 'path'
import { useGCS, signedUrl, getUploadSignedUrl, streamFile, gcsPathFromUrl } from '../lib/gcs'

const ALLOWED_FOLDERS = ['profiles', 'service', 'service-videos', 'commissioning'] as const

export async function sign(req: Request, res: Response) {
  if (!useGCS) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'GCS not configured' } }); return }

  const { paths } = req.body as { paths?: string[] }
  if (!Array.isArray(paths) || paths.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'paths array required' } }); return
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
    const gcsPath = `${folder}/${randomUUID()}${ext}`
    const uploadUrl = await getUploadSignedUrl(gcsPath, contentType)
    const gcsUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsPath}`
    res.json({ uploadUrl, gcsUrl })
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
