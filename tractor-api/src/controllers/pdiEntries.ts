import type { Response } from 'express'
import { PdiEntry, type UserRef, type IChecklistItem, type IOeDataRow } from '../models/PdiEntry'
import { TractorAsset } from '../models/TractorAsset'
import { User } from '../models/User'
import { nextSeq, generateSrNumber } from '../utils/srNumber'
import { PDI_OE_DATA_TEMPLATE, PDI_CHECKLIST_TEMPLATE } from '../config/pdiChecklistTemplate'
import { logChange, diffFields } from '../utils/changeLog'
import type { AuthRequest } from '../middleware/requireAuth'

function actorRef(req: AuthRequest): UserRef {
  const u = req.user!
  return { userId: u.userId as unknown as UserRef['userId'], name: u.name, role: u.role }
}

const PRIVILEGED_ROLES = new Set(['admin', 'rsm', 'area_manager'])

// `.lean()` reads skip Mongoose's schema-default hydration, so checklist items
// on PdiEntry documents created before `partsUsed` was added come back without
// it. Normalize on the way out so the client can always rely on an array.
export function withChecklistDefaults<T extends { checklist?: IChecklistItem[] }>(entry: T): T {
  if (entry.checklist) {
    entry.checklist = entry.checklist.map(item => ({ ...item, partsUsed: item.partsUsed ?? [] }))
  }
  return entry
}

export async function list(req: AuthRequest, res: Response) {
  const { tractorId, status } = req.query as Record<string, string | undefined>
  const filter: Record<string, unknown> = {}
  if (tractorId) filter.tractorId = tractorId
  if (status) filter.status = status

  const user = req.user!
  if (!PRIVILEGED_ROLES.has(user.role)) {
    filter.$or = [{ 'assignedTo.userId': user.userId }, { 'createdBy.userId': user.userId }]
  }

  const entries = await PdiEntry.find(filter)
    .sort({ createdAt: -1 })
    .populate('tractorId', 'tractorModel chassisNo engineNo')
    .lean()
  res.json(entries.map(withChecklistDefaults))
}

export async function getById(req: AuthRequest, res: Response) {
  const entry = await PdiEntry.findById(req.params.id).populate('tractorId', 'tractorModel chassisNo engineNo dispatchDate').lean()
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  res.json(withChecklistDefaults(entry))
}

export async function create(req: AuthRequest, res: Response) {
  const { tractorId, assignedToUserId, remark } = req.body as {
    tractorId?: string; assignedToUserId?: string; remark?: string
  }

  if (!tractorId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'tractorId is required' } }); return
  }

  const tractor = await TractorAsset.findById(tractorId).lean()
  if (!tractor) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tractor not found' } }); return }

  const actor = actorRef(req)
  let assignedTo: UserRef = actor
  if (assignedToUserId && assignedToUserId !== req.user!.userId) {
    const assignee = await User.findById(assignedToUserId).lean()
    if (!assignee) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Assignee not found' } }); return }
    assignedTo = { userId: assignee._id as unknown as UserRef['userId'], name: assignee.name, role: assignee.role }
  }

  const now = new Date()
  const seq = await nextSeq(`pdi-${now.getFullYear()}`)
  const srNumber = generateSrNumber(now, seq)

  const oeData: IOeDataRow[] = PDI_OE_DATA_TEMPLATE.map(t => ({ parameter: t.parameter }))
  const checklist: IChecklistItem[] = PDI_CHECKLIST_TEMPLATE.map(t => ({ ...t, partsUsed: [] }))

  const entry = await PdiEntry.create({
    srNumber,
    tractorId,
    status: 'assigned',
    assignedTo,
    createdBy: actor,
    remark,
    oeData,
    checklist,
    statusHistory: [{ status: 'assigned', at: new Date(), by: actor }],
  })

  void logChange({
    entityType: 'pdi_entry', entityId: entry._id.toString(), entityLabel: entry.srNumber,
    category: 'pdi_info', action: 'created', changes: [], by: { userId: actor.userId.toString(), name: actor.name, role: actor.role },
  })

  res.status(201).json(entry)
}

function canAct(req: AuthRequest, entry: { assignedTo: UserRef }): boolean {
  const user = req.user!
  return PRIVILEGED_ROLES.has(user.role) || entry.assignedTo.userId.toString() === user.userId
}

export async function update(req: AuthRequest, res: Response) {
  const body = req.body as Record<string, unknown>
  const before = await PdiEntry.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  if (before.status === 'completed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cannot edit a completed PDI' } }); return
  }
  if (!canAct(req, before)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not assigned to you' } }); return }

  const writable = ['hmr', 'pdiLocation', 'bomCode', 'modelDesc', 'pdiDate', 'remark'] as const
  const upd: Record<string, unknown> = {}
  for (const key of writable) {
    if (body[key] === undefined) continue
    upd[key] = key === 'pdiDate' ? new Date(body[key] as string) : body[key]
  }

  if (upd.pdiDate) {
    const tractor = await TractorAsset.findById(before.tractorId).lean()
    if (tractor?.dispatchDate && (upd.pdiDate as Date) < new Date(tractor.dispatchDate)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'PDI Date must be on or after the tractor dispatch date' } }); return
    }
  }

  const entry = await PdiEntry.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }).lean()
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const changes = diffFields(before as unknown as Record<string, unknown>, entry as unknown as Record<string, unknown>, {
    hmr: 'HMR', pdiLocation: 'PDI Location', bomCode: 'Bom Code', modelDesc: 'Model Desc', pdiDate: 'PDI Date', remark: 'Remark',
  })
  void logChange({
    entityType: 'pdi_entry', entityId: req.params.id, entityLabel: entry.srNumber,
    category: 'pdi_info', action: 'updated', changes, by: actorRef(req) as unknown as { userId: string; name: string; role: string },
  })

  res.json(withChecklistDefaults(entry))
}

async function transition(req: AuthRequest, res: Response, opts: {
  from: string[]; to: 'acknowledgment' | 'started'; timestampField?: 'acknowledgedAt' | 'startedAt'
}) {
  const entry = await PdiEntry.findById(req.params.id)
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  if (!canAct(req, entry)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not assigned to you' } }); return }
  if (!opts.from.includes(entry.status)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Cannot move from ${entry.status} to ${opts.to}` } }); return
  }

  const actor = actorRef(req)
  entry.status = opts.to
  if (opts.timestampField) (entry as unknown as Record<string, Date>)[opts.timestampField] = new Date()
  entry.statusHistory.push({ status: opts.to, at: new Date(), by: actor })
  await entry.save()

  res.json(entry)
}

export const acknowledge = (req: AuthRequest, res: Response) =>
  transition(req, res, { from: ['assigned'], to: 'acknowledgment', timestampField: 'acknowledgedAt' })

export const start = (req: AuthRequest, res: Response) =>
  transition(req, res, { from: ['acknowledgment'], to: 'started', timestampField: 'startedAt' })

export async function saveProgress(req: AuthRequest, res: Response) {
  const { oeData, checklist } = req.body as { oeData?: IOeDataRow[]; checklist?: IChecklistItem[] }
  const entry = await PdiEntry.findById(req.params.id)
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  if (!canAct(req, entry)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not assigned to you' } }); return }
  if (!['started', 'continue'].includes(entry.status)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'PDI must be started before saving progress' } }); return
  }

  if (oeData) entry.oeData = oeData
  if (checklist) entry.checklist = checklist

  if (entry.status === 'started') {
    entry.status = 'continue'
    entry.statusHistory.push({ status: 'continue', at: new Date(), by: actorRef(req) })
  }

  await entry.save()
  res.json(entry)
}

export async function complete(req: AuthRequest, res: Response) {
  const { oeData, checklist } = req.body as { oeData?: IOeDataRow[]; checklist?: IChecklistItem[] }
  const entry = await PdiEntry.findById(req.params.id)
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  if (!canAct(req, entry)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not assigned to you' } }); return }
  if (!['started', 'continue'].includes(entry.status)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Cannot complete from status ${entry.status}` } }); return
  }

  if (oeData) entry.oeData = oeData
  if (checklist) entry.checklist = checklist

  const completionDate = new Date()
  const tractor = await TractorAsset.findById(entry.tractorId).lean()
  if (tractor?.dispatchDate && completionDate < new Date(tractor.dispatchDate)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'PDI Date must be on or after the tractor dispatch date' } }); return
  }

  const actor = actorRef(req)
  entry.status = 'completed'
  entry.pdiDate = entry.pdiDate ?? completionDate
  entry.completedAt = completionDate
  entry.checkedByName = entry.checkedByName || actor.name
  entry.statusHistory.push({ status: 'completed', at: completionDate, by: actor })
  await entry.save()

  await TractorAsset.findByIdAndUpdate(entry.tractorId, { pdiDate: entry.pdiDate })

  void logChange({
    entityType: 'pdi_entry', entityId: entry._id.toString(), entityLabel: entry.srNumber,
    category: 'pdi_info', action: 'updated', changes: [{ field: 'status', label: 'Status', from: 'continue', to: 'completed' }],
    by: { userId: actor.userId.toString(), name: actor.name, role: actor.role },
  })

  res.json(entry)
}

export async function reassign(req: AuthRequest, res: Response) {
  const { toUserId, reason } = req.body as { toUserId?: string; reason?: string }
  if (!toUserId) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'toUserId is required' } }); return }

  const entry = await PdiEntry.findById(req.params.id)
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  if (entry.status === 'completed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cannot reassign a completed PDI' } }); return
  }

  const toUser = await User.findById(toUserId).lean()
  if (!toUser) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'User not found' } }); return }

  const actor = actorRef(req)
  const fromUser = entry.assignedTo
  const toUserRef: UserRef = { userId: toUser._id as unknown as UserRef['userId'], name: toUser.name, role: toUser.role }

  entry.reassignments.push({ fromUser, toUser: toUserRef, reassignedBy: actor, reason, at: new Date() })
  entry.assignedTo = toUserRef
  entry.status = 'assigned'
  entry.statusHistory.push({ status: 'assigned', at: new Date(), by: actor })
  await entry.save()

  void logChange({
    entityType: 'pdi_entry', entityId: entry._id.toString(), entityLabel: entry.srNumber,
    category: 'pdi_info', action: 'updated',
    changes: [{ field: 'assignedTo', label: 'Assigned To', from: fromUser.name, to: toUserRef.name }],
    by: { userId: actor.userId.toString(), name: actor.name, role: actor.role },
  })

  res.json(entry)
}

export async function remove(req: AuthRequest, res: Response) {
  const entry = await PdiEntry.findById(req.params.id).lean()
  if (!entry) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  await PdiEntry.findByIdAndDelete(req.params.id)

  void logChange({
    entityType: 'pdi_entry', entityId: req.params.id, entityLabel: entry.srNumber,
    category: 'pdi_info', action: 'deleted', changes: [], by: actorRef(req) as unknown as { userId: string; name: string; role: string },
  })

  res.status(204).end()
}
