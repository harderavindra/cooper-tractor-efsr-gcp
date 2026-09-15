import crypto from 'crypto'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/requireAuth'
import { useGCS, signedUrl } from '../lib/gcs'

const MAX_LOGIN_ATTEMPTS  = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000   // 30 days

async function maybeSignProfilePic(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl || !useGCS || !rawUrl.startsWith('https://storage.googleapis.com/')) {
    return rawUrl ?? null
  }
  try {
    const path = rawUrl.split('/').slice(4).join('/')
    return await signedUrl(path, 24 * 60 * 60 * 1000)
  } catch {
    return rawUrl
  }
}

function signAccessToken(payload: object): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn']
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn })
}

async function generateRefreshToken(userId: string): Promise<string> {
  const randomPart = crypto.randomBytes(40).toString('hex')
  const plain = `${userId}:${randomPart}`
  const hash  = await bcrypt.hash(randomPart, 8)
  const expiry = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  await User.findByIdAndUpdate(userId, {
    refreshTokenHash:   hash,
    refreshTokenExpiry: expiry,
  })
  return plain
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as { username?: string; password?: string }

  if (!username || !password) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email / mobile and password are required' } })
    return
  }

  const login = username.toLowerCase().trim()
  const user = await User.findOne({
    $or: [{ username: login }, { email: login }, { mobile: login }],
  })
  if (!user) {
    res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } })
    return
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive' } })
    return
  }

  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const retryAfter = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000)
    res.status(423).json({ error: { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked. Try again later.', retryAfter } })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const attempts = (user.loginAttempts ?? 0) + 1
    const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS
    await User.findByIdAndUpdate(user._id, {
      loginAttempts: attempts,
      ...(shouldLock ? { lockoutUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) } : {}),
    })
    res.status(401).json({
      error: {
        code: shouldLock ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
        message: shouldLock ? 'Too many failed attempts. Account locked for 15 minutes.' : 'Invalid credentials',
      },
    })
    return
  }

  await User.findByIdAndUpdate(user._id, {
    loginAttempts: 0,
    lockoutUntil:  null,
    lastLogin:     new Date(),
  })

  const payload = {
    userId:     user._id.toString(),
    username:   user.username,
    name:       user.name,
    role:       user.role,
    dealerName: user.dealerName,
    regionId:   user.regionId?.toString(),
    areaIds:    user.areaIds?.map(id => id.toString()) ?? [],
  }

  const token        = signAccessToken(payload)
  const refreshToken = await generateRefreshToken(user._id.toString())

  res.json({
    token,
    refreshToken,
    ...payload,
    profilePic: await maybeSignProfilePic(user.profilePic),
  })
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken?: string }
  if (!refreshToken) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' } })
    return
  }

  // Token format: `userId:randomHex` — extract userId for O(1) lookup
  const colonIdx = refreshToken.indexOf(':')
  if (colonIdx === -1) {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } })
    return
  }
  const userId     = refreshToken.slice(0, colonIdx)
  const randomPart = refreshToken.slice(colonIdx + 1)

  const user = await User.findById(userId).select('+refreshTokenHash +refreshTokenExpiry')
  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiry) {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } })
    return
  }

  if (user.refreshTokenExpiry < new Date()) {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } })
    return
  }

  const valid = await bcrypt.compare(randomPart, user.refreshTokenHash)
  if (!valid) {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } })
    return
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive' } })
    return
  }

  const payload = {
    userId:     user._id.toString(),
    username:   user.username,
    name:       user.name,
    role:       user.role,
    dealerName: user.dealerName,
    regionId:   user.regionId?.toString(),
    areaIds:    user.areaIds?.map(id => id.toString()) ?? [],
  }

  const newToken        = signAccessToken(payload)
  const newRefreshToken = await generateRefreshToken(user._id.toString())

  res.json({ token: newToken, refreshToken: newRefreshToken })
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken?: string }

  if (refreshToken) {
    const colonIdx = refreshToken.indexOf(':')
    if (colonIdx !== -1) {
      const userId     = refreshToken.slice(0, colonIdx)
      const randomPart = refreshToken.slice(colonIdx + 1)
      const user = await User.findById(userId).select('+refreshTokenHash')
      if (user?.refreshTokenHash && await bcrypt.compare(randomPart, user.refreshTokenHash)) {
        await User.findByIdAndUpdate(userId, {
          $unset: { refreshTokenHash: 1, refreshTokenExpiry: 1 },
        })
      }
    }
  }

  res.status(204).end()
}

export async function me(req: AuthRequest, res: Response) {
  const dbUser = await User.findById(req.user!.userId).select('profilePic').lean()
  res.json({ ...req.user, profilePic: await maybeSignProfilePic(dbUser?.profilePic) })
}
