import type { Request, Response } from 'express'
import { Region } from '../models/Region'
import { logChange, diffFields, REGION_FIELDS } from '../utils/changeLog'

export async function list(_req: Request, res: Response) {
  const regions = await Region.find()
    .populate('managerId', 'name username')
    .sort({ name: 1 })
    .lean()
  res.json(regions)
}

export async function create(req: Request, res: Response) {
  const { name, managerId, states } = req.body as { name?: string; managerId?: string; states?: string[] }
  if (!name?.trim()) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } }); return }
  try {
    const region = await Region.create({ name: name.trim(), managerId: managerId || undefined, states: states ?? [] })

    void logChange({
      entityType: 'region', entityId: region._id.toString(), entityLabel: region.name,
      category: 'master_region', action: 'created', changes: [], by: null,
    })

    res.status(201).json(region)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Region name already exists' } }); return
    }
    throw err
  }
}

export async function update(req: Request, res: Response) {
  const { name, managerId, states } = req.body as { name?: string; managerId?: string; states?: string[] }

  const before = await Region.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Region not found' } }); return }

  const updateDoc: Record<string, unknown> = {}
  if (name !== undefined) updateDoc.name = name.trim()
  if (managerId !== undefined) updateDoc.managerId = managerId || null
  if (states !== undefined) updateDoc.states = states
  const region = await Region.findByIdAndUpdate(req.params.id, updateDoc, { new: true, runValidators: true })
    .populate('managerId', 'name username')
    .lean()
  if (!region) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Region not found' } }); return }

  const changes = diffFields(before as unknown as Record<string, unknown>, region as unknown as Record<string, unknown>, REGION_FIELDS)
  void logChange({
    entityType:  'region',
    entityId:    req.params.id,
    entityLabel: region.name as string,
    category:    'master_region',
    action:      'updated',
    changes,
    by:          null,
  })

  res.json(region)
}

export async function remove(req: Request, res: Response) {
  const region = await Region.findById(req.params.id).lean()
  if (!region) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Region not found' } }); return }

  await Region.findByIdAndDelete(req.params.id)

  void logChange({
    entityType:  'region',
    entityId:    req.params.id,
    entityLabel: region.name as string,
    category:    'master_region',
    action:      'deleted',
    changes:     [],
    by:          null,
  })

  res.status(204).end()
}
