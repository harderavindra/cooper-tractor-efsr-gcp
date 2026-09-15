import type { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import { LaborCharge } from '../models/LaborCharge'
import { logChange, diffFields, LABOR_CHARGE_FIELDS } from '../utils/changeLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  const filter = q
    ? { $or: [
        { defectCode: { $regex: q, $options: 'i' } },
        { defect:     { $regex: q, $options: 'i' } },
        { aggregate:  { $regex: q, $options: 'i' } },
      ] }
    : {}
  const charges = await LaborCharge.find(filter)
    .sort({ aggregate: 1, subAggregate: 1, defectCode: 1 })
    .lean()
  res.json(charges)
}

export async function create(req: Request, res: Response) {
  const { defectCode, defect, aggregate, subAggregate } = req.body as {
    defectCode?: string; defect?: string; aggregate?: string; subAggregate?: string
  }
  if (!defectCode?.trim() || !defect?.trim() || !aggregate?.trim() || !subAggregate?.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'defectCode, defect, aggregate, and subAggregate are required' } }); return
  }
  try {
    const lc = await LaborCharge.create({
      defectCode:   defectCode.trim(),
      defect:       defect.trim(),
      aggregate:    aggregate.trim(),
      subAggregate: subAggregate.trim(),
    })

    void logChange({
      entityType: 'labor_charge', entityId: lc._id.toString(), entityLabel: `${lc.defectCode} — ${lc.defect}`,
      category: 'master_labor_charge', action: 'created', changes: [], by: null,
    })

    res.status(201).json(lc)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Defect code already exists' } }); return
    }
    throw err
  }
}

export async function update(req: Request, res: Response) {
  const { defectCode, defect, aggregate, subAggregate } = req.body as {
    defectCode?: string; defect?: string; aggregate?: string; subAggregate?: string
  }

  const before = await LaborCharge.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  let lc
  try {
    lc = await LaborCharge.findByIdAndUpdate(
      req.params.id,
      {
        defectCode:   defectCode?.trim(),
        defect:       defect?.trim(),
        aggregate:    aggregate?.trim(),
        subAggregate: subAggregate?.trim(),
      },
      { new: true, runValidators: true }
    ).lean()
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Defect code already exists' } }); return
    }
    throw err
  }
  if (!lc) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const changes = diffFields(before as unknown as Record<string, unknown>, lc as unknown as Record<string, unknown>, LABOR_CHARGE_FIELDS)
  void logChange({
    entityType:  'labor_charge',
    entityId:    req.params.id,
    entityLabel: `${lc.defectCode} — ${lc.defect}`,
    category:    'master_labor_charge',
    action:      'updated',
    changes,
    by:          null,
  })

  res.json(lc)
}

export async function remove(req: Request, res: Response) {
  const lc = await LaborCharge.findById(req.params.id).lean()
  if (!lc) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  await LaborCharge.findByIdAndDelete(req.params.id)

  void logChange({
    entityType:  'labor_charge',
    entityId:    req.params.id,
    entityLabel: `${lc.defectCode} — ${lc.defect}`,
    category:    'master_labor_charge',
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

  const toDelete = await LaborCharge.find({ _id: { $in: ids } }, 'defectCode defect').lean()
  const result   = await LaborCharge.deleteMany({ _id: { $in: ids } })

  for (const lc of toDelete) {
    void logChange({
      entityType:  'labor_charge',
      entityId:    lc._id.toString(),
      entityLabel: `${lc.defectCode} — ${lc.defect}`,
      category:    'master_labor_charge',
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

  type BulkOp = { updateOne: { filter: Record<string, string>; update: { $set: Record<string, string> }; upsert: boolean } }
  const ops: BulkOp[] = []
  let skipped = 0

  for (const row of rows) {
    const defectCode = col(row, 'Defect Code', 'DefectCode', 'defectCode')
    const defect      = col(row, 'Defect', 'defect')
    const aggregate    = col(row, 'Aggregate', 'aggregate')
    const subAggregate = col(row, 'Sub Aggregate', 'SubAggregate', 'subAggregate')

    if (!defectCode || !defect || !aggregate || !subAggregate) { skipped++; continue }

    ops.push({
      updateOne: {
        filter: { defectCode },
        update: { $set: { defectCode, defect, aggregate, subAggregate } },
        upsert: true,
      },
    })
  }

  if (ops.length === 0) {
    res.status(400).json({ message: 'No valid rows found in file', skipped }); return
  }

  const result = await LaborCharge.bulkWrite(ops)
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, skipped, total: rows.length })
}
