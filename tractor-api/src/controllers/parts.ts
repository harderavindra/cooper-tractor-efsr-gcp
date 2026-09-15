import type { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import { Part } from '../models/Part'
import { logChange, diffFields, PART_FIELDS } from '../utils/changeLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  const filter = q
    ? { $or: [
        { componentNumber: { $regex: q, $options: 'i' } },
        { description:      { $regex: q, $options: 'i' } },
      ] }
    : {}
  const parts = await Part.find(filter)
    .sort({ componentNumber: 1 })
    .lean()
  res.json(parts)
}

export async function create(req: Request, res: Response) {
  const { componentNumber, description, category, maxQty } = req.body as {
    componentNumber?: string; description?: string; category?: string; maxQty?: number
  }
  if (!componentNumber?.trim() || !description?.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'componentNumber and description are required' } }); return
  }
  try {
    const part = await Part.create({
      componentNumber: componentNumber.trim(),
      description:     description.trim(),
      category:        category || undefined,
      maxQty:          maxQty ?? undefined,
    })

    void logChange({
      entityType: 'part', entityId: part._id.toString(), entityLabel: `${part.componentNumber} — ${part.description}`,
      category: 'master_part', action: 'created', changes: [], by: null,
    })

    res.status(201).json(part)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Component number already exists' } }); return
    }
    throw err
  }
}

export async function update(req: Request, res: Response) {
  const { componentNumber, description, category, maxQty } = req.body as {
    componentNumber?: string; description?: string; category?: string; maxQty?: number
  }

  const before = await Part.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const upd: Record<string, unknown> = {}
  if (componentNumber !== undefined) upd.componentNumber = componentNumber.trim()
  if (description     !== undefined) upd.description     = description.trim()
  if (category        !== undefined) upd.category        = category || undefined
  if (maxQty          !== undefined) upd.maxQty           = maxQty

  let part
  try {
    part = await Part.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }).lean()
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Component number already exists' } }); return
    }
    throw err
  }
  if (!part) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const changes = diffFields(before as unknown as Record<string, unknown>, part as unknown as Record<string, unknown>, PART_FIELDS)
  void logChange({
    entityType:  'part',
    entityId:    req.params.id,
    entityLabel: `${part.componentNumber} — ${part.description}`,
    category:    'master_part',
    action:      'updated',
    changes,
    by:          null,
  })

  res.json(part)
}

export async function remove(req: Request, res: Response) {
  const part = await Part.findById(req.params.id).lean()
  if (!part) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  await Part.findByIdAndDelete(req.params.id)

  void logChange({
    entityType:  'part',
    entityId:    req.params.id,
    entityLabel: `${part.componentNumber} — ${part.description}`,
    category:    'master_part',
    action:      'deleted',
    changes:     [],
    by:          null,
  })

  res.status(204).end()
}

export async function removeMany(req: Request, res: Response) {
  const { ids } = req.body as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'ids array is required' } }); return
  }

  const toDelete = await Part.find({ _id: { $in: ids } }, 'componentNumber description').lean()
  const result   = await Part.deleteMany({ _id: { $in: ids } })

  for (const part of toDelete) {
    void logChange({
      entityType:  'part',
      entityId:    part._id.toString(),
      entityLabel: `${part.componentNumber} — ${part.description}`,
      category:    'master_part',
      action:      'deleted',
      changes:     [],
      by:          null,
    })
  }

  res.json({ deleted: result.deletedCount })
}

export async function importFile(req: Request, res: Response) {
  if (!req.file) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } }); return }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
  const sheet    = workbook.Sheets[workbook.SheetNames[0]]
  const rows     = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  function col(row: Record<string, unknown>, ...keys: string[]): string {
    const normalized = new Map<string, unknown>()
    for (const [k, v] of Object.entries(row)) {
      normalized.set(k.trim().toLowerCase(), v)
    }
    for (const k of keys) {
      const v = normalized.get(k.trim().toLowerCase())
      if (v !== undefined && v !== '') return String(v).trim()
    }
    return ''
  }

  type BulkOp = { updateOne: { filter: Record<string, string>; update: { $set: Record<string, unknown> }; upsert: boolean } }
  const ops: BulkOp[] = []
  let skipped = 0

  for (const row of rows) {
    const componentNumber = col(row, 'Part No.', 'Part No', 'PartNo', 'Component Number', 'ComponentNumber', 'componentNumber', 'Component No', 'Code')
    if (!componentNumber) { skipped++; continue }

    const maxQtyRaw = col(row, 'Max Qty', 'Max QTY', 'MaxQty', 'maxQty', 'Max Quantity')

    ops.push({
      updateOne: {
        filter: { componentNumber },
        update: {
          $set: {
            componentNumber,
            description: col(row, 'Part Description', 'Description', 'description'),
            category:    col(row, 'Category', 'category') || undefined,
            maxQty:      maxQtyRaw ? Number(maxQtyRaw) : undefined,
          },
        },
        upsert: true,
      },
    })
  }

  if (ops.length === 0) {
    res.status(400).json({ message: 'No valid rows found in file', skipped }); return
  }

  const result = await Part.bulkWrite(ops)
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, skipped, total: rows.length })
}
