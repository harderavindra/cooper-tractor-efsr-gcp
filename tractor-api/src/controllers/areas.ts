import type { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Area } from '../models/Area'
import { User } from '../models/User'
import { logChange, diffFields, AREA_FIELDS } from '../utils/changeLog'

export async function list(req: Request, res: Response) {
  const match: Record<string, unknown> = {}
  if (req.query.regionId) {
    try { match.regionId = new Types.ObjectId(String(req.query.regionId)) } catch { /* ignore invalid id */ }
  }

  const areas = await Area.aggregate([
    { $match: match },
    // Source A: Area.managerIds[] — set by both User Mgmt and MasterSetup edits
    { $lookup: {
      from: 'users', localField: 'managerIds', foreignField: '_id', as: '_fromAreaIds',
      pipeline: [{ $project: { name: 1, username: 1 } }],
    }},
    // Source B: users whose User.areaIds[] contains this area — covers pre-refactor assignments
    { $lookup: {
      from: 'users',
      let: { aId: '$_id' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$role', 'area_manager'] },
          { $in: ['$$aId', { $ifNull: ['$areaIds', []] }] },
        ]}}},
        { $project: { name: 1, username: 1 } },
      ],
      as: '_fromUsers',
    }},
    // Source C: legacy single Area.managerId field
    { $lookup: {
      from: 'users',
      let: { legacyId: { $ifNull: ['$managerId', null] } },
      pipeline: [
        { $match: { $expr: { $and: [
          { $ne: ['$$legacyId', null] },
          { $eq: ['$_id', '$$legacyId'] },
        ]}}},
        { $project: { name: 1, username: 1 } },
      ],
      as: '_fromLegacy',
    }},
    // Merge A ∪ B ∪ C, deduplicated by _id
    { $addFields: {
      _allMgrs: { $concatArrays: ['$_fromAreaIds', '$_fromUsers', '$_fromLegacy'] },
    }},
    { $addFields: {
      managerIds: {
        $reduce: {
          input: '$_allMgrs',
          initialValue: [],
          in: {
            $cond: [
              { $in: ['$$this._id', { $map: { input: '$$value', as: 'v', in: '$$v._id' } }] },
              '$$value',
              { $concatArrays: ['$$value', ['$$this']] },
            ],
          },
        },
      },
    }},
    { $lookup: { from: 'regions', localField: 'regionId', foreignField: '_id', as: '_reg',
        pipeline: [{ $project: { name: 1 } }] } },
    { $addFields: { regionId: { $first: '$_reg' } } },
    { $unset: ['_fromAreaIds', '_fromUsers', '_fromLegacy', '_allMgrs', '_reg'] },
    { $sort: { name: 1 } },
  ])
  res.json(areas)
}

export async function create(req: Request, res: Response) {
  const { name, regionId, managerIds } = req.body as {
    name?: string; regionId?: string; managerIds?: string[]
  }
  if (!name?.trim() || !regionId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and regionId are required' } }); return
  }
  try {
    const cleanIds = Array.isArray(managerIds) ? managerIds.filter(Boolean) : []
    const area = await Area.create({ name: name.trim(), regionId, managerIds: cleanIds })
    if (cleanIds.length) {
      await User.updateMany({ _id: { $in: cleanIds } }, { $addToSet: { areaIds: area._id } })
    }
    const populated = await Area.findById(area._id)
      .populate('managerIds', 'name username')
      .populate('regionId', 'name')
      .lean()

    void logChange({
      entityType: 'area', entityId: area._id.toString(), entityLabel: name.trim(),
      category: 'master_area', action: 'created', changes: [], by: null,
    })

    res.status(201).json(populated)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Area name already exists in this region' } }); return
    }
    throw err
  }
}

export async function update(req: Request, res: Response) {
  const { name, managerIds } = req.body as { name?: string; managerIds?: string[] }
  const areaId    = req.params.id
  const areaObjId = new Types.ObjectId(areaId)

  // Use the raw collection to read legacy managerId field (not in schema)
  const rawArea = await Area.collection.findOne({ _id: areaObjId })
  if (!rawArea) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Area not found' } }); return }

  const before = await Area.findById(areaId).lean()

  const updateDoc: Record<string, unknown> = {}
  if (name !== undefined) updateDoc.name = (name as string).trim()

  if (managerIds !== undefined) {
    const incoming = (managerIds as string[]).filter(Boolean)

    // Collect ALL current managers from every source to compute a correct diff
    const fromAreaDoc  = ((rawArea.managerIds ?? []) as Types.ObjectId[]).map(id => id.toString())
    const fromUserSide = (await User.find({ role: 'area_manager', areaIds: areaObjId }, '_id').lean())
                           .map(u => u._id.toString())
    const legacyId     = rawArea.managerId?.toString()
    const allCurrent   = [...new Set([...fromAreaDoc, ...fromUserSide, legacyId].filter(Boolean) as string[])]

    const added   = incoming.filter(id => !allCurrent.includes(id))
    const removed = allCurrent.filter(id => !incoming.includes(id))

    updateDoc.managerIds = incoming

    if (added.length)   await User.updateMany({ _id: { $in: added   } }, { $addToSet: { areaIds: areaObjId } })
    if (removed.length) await User.updateMany({ _id: { $in: removed } }, { $pull:     { areaIds: areaObjId } })
  }

  await Area.findByIdAndUpdate(areaId, updateDoc, { runValidators: true })

  const after = await Area.findById(areaId).lean()
  const changes = before && after
    ? diffFields(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>, AREA_FIELDS)
    : []

  void logChange({
    entityType:  'area',
    entityId:    areaId,
    entityLabel: (after as { name?: string } | null)?.name ?? areaId,
    category:    'master_area',
    action:      'updated',
    changes,
    by:          null,
  })

  res.json({ ok: true })
}

export async function remove(req: Request, res: Response) {
  const area = await Area.findById(req.params.id).lean()
  if (!area) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Area not found' } }); return }

  await Area.findByIdAndDelete(req.params.id)

  void logChange({
    entityType:  'area',
    entityId:    req.params.id,
    entityLabel: area.name as string,
    category:    'master_area',
    action:      'deleted',
    changes:     [],
    by:          null,
  })

  res.status(204).end()
}
