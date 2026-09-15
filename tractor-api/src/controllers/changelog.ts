import type { Response } from 'express'
import { Types } from 'mongoose'
import { ChangeLog, ChangeCategories, ChangeEntityTypes } from '../models/ChangeLog.js'
import type { AuthRequest } from '../middleware/requireAuth.js'
import { getSubordinateUserIds } from '../utils/userHierarchy.js'

// ── PII masking helpers ───────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local[0]}***@${domain}`
}

function maskMobile(mobile: string): string {
  if (mobile.length < 6) return '***'
  return `${mobile.slice(0, 2)}***${mobile.slice(-4)}`
}

const PII_FIELDS = new Set(['email', 'mobile', 'clientEmail', 'primaryContactNumber', 'alternateContactNumber'])

function maskChangeEntry(
  change: { field: string; label: string; from: unknown; to: unknown },
  role: string
): typeof change {
  if (role === 'admin' || !PII_FIELDS.has(change.field)) return change
  const mask = (v: unknown): unknown => {
    if (typeof v !== 'string' || !v) return v
    if (change.field === 'email' || change.field === 'clientEmail') return maskEmail(v)
    return maskMobile(v)
  }
  return { ...change, from: mask(change.from), to: mask(change.to) }
}

// ── RBAC filter builder ───────────────────────────────────────────────────────

async function buildRbacFilter(req: AuthRequest): Promise<Record<string, unknown> | null> {
  const user = req.user!
  const { role, userId } = user
  if (role === 'admin') return {}

  if (role === 'rsm' && !user.regionId) return null

  if (role === 'rsm' || role === 'area_manager' || role === 'service_engineer' || role === 'service_technician') {
    const subIds = await getSubordinateUserIds(user)
    const hierarchyUserIds = subIds === 'ALL' ? [] : [userId, ...subIds]
    return {
      $or: [
        { entityType: { $in: ['asset', 'region', 'area', 'labor_charge', 'part', 'customer', 'tractor_asset', 'pdi_entry'] } },
        { entityType: 'user', entityId: { $in: hierarchyUserIds.map(id => new Types.ObjectId(id)) } },
      ],
    }
  }

  // dealer or mechanic — own profile only
  return { entityType: 'user', entityId: new Types.ObjectId(userId) }
}

// ── GET /api/changelog ────────────────────────────────────────────────────────

export async function list(req: AuthRequest, res: Response) {
  const {
    entityType, entityId, category, action,
    from, to, page: pageRaw, limit: limitRaw,
  } = req.query as Record<string, string | undefined>

  const page  = Math.max(1, parseInt(pageRaw  ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(limitRaw ?? '20', 10)))
  const skip  = (page - 1) * limit

  // Build base query filter
  const filter: Record<string, unknown> = {}
  if (entityType && ChangeEntityTypes.includes(entityType as typeof ChangeEntityTypes[number])) {
    filter.entityType = entityType
  }
  if (entityId && Types.ObjectId.isValid(entityId)) {
    filter.entityId = new Types.ObjectId(entityId)
  }
  if (category && ChangeCategories.includes(category as typeof ChangeCategories[number])) {
    filter.category = category
  }
  if (action && ['created', 'updated', 'deleted'].includes(action)) {
    filter.action = action
  }
  if (from || to) {
    const atFilter: Record<string, Date> = {}
    if (from) atFilter.$gte = new Date(from)
    if (to)   atFilter.$lte = new Date(to)
    filter.at = atFilter
  }

  // Apply RBAC
  const rbacFilter = await buildRbacFilter(req)
  if (rbacFilter === null) {
    res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } }); return
  }

  const combined = Object.keys(rbacFilter).length
    ? { $and: [filter, rbacFilter] }
    : filter

  const [docs, total] = await Promise.all([
    ChangeLog.find(combined).sort({ at: -1 }).skip(skip).limit(limit).lean(),
    ChangeLog.countDocuments(combined),
  ])

  const role = req.user!.role
  const data = docs.map(doc => ({
    ...doc,
    changes: doc.changes.map(c => maskChangeEntry(c, role)),
  }))

  res.json({
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
