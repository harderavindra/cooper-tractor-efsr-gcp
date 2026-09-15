import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { UserRoleValue } from '../models/User'

export interface AuthUser {
  userId:      string
  username:    string
  name:        string
  role:        UserRoleValue
  dealerName?: string
  regionId?:   string
  areaIds?:    string[]
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token' } })
  }
}

export function requireRole(...roles: UserRoleValue[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } })
      return
    }
    next()
  }
}
