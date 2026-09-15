export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly meta?: Record<string, unknown>

  constructor(statusCode: number, code: string, message: string, meta?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.meta = meta
  }
}

export class ValidationError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', message, meta)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message)
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(409, code, message, meta)
  }
}
