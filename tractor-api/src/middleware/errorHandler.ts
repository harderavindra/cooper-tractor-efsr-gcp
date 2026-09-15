import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../core/errors/AppError'
import { logger } from '../core/logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err, path: req.path }, err.message)
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, ...(err.meta ? { meta: err.meta } : {}) } })
    return
  }
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable' } }); return
  }
  if (err.name === 'MulterError') {
    res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message } }); return
  }
  if (err.message?.startsWith('CORS:')) {
    res.status(403).json({ error: { code: 'CORS_BLOCKED', message: err.message } }); return
  }
  logger.error({ err, path: req.path }, 'Unhandled error')
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } })
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  res.on('finish', () => {
    logger.info({ method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start }, 'request')
  })
  next()
}
