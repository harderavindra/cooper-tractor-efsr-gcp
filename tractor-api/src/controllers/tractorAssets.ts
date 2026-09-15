import type { Request, Response } from 'express'
import { TractorAsset } from '../models/TractorAsset'
import { logChange, diffFields, TRACTOR_FIELDS } from '../utils/changeLog'

type TractorStatus = 'not_dispatched' | 'dispatched' | 'pdi_completed' | 'sold'

function deriveStatus(t: { dispatchDate?: Date | null; pdiDate?: Date | null; dateOfSale?: Date | null }): TractorStatus {
  if (t.dateOfSale)   return 'sold'
  if (t.pdiDate)       return 'pdi_completed'
  if (t.dispatchDate) return 'dispatched'
  return 'not_dispatched'
}

const CUSTOMER_POPULATE = 'fullName primaryContactName primaryContactNo'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  const filter = q
    ? { $or: [
        { chassisNo:      { $regex: q, $options: 'i' } },
        { engineNo:       { $regex: q, $options: 'i' } },
        { tractorModel:   { $regex: q, $options: 'i' } },
        { registrationNo: { $regex: q, $options: 'i' } },
      ] }
    : {}
  const tractors = await TractorAsset.find(filter)
    .sort({ createdAt: -1 })
    .populate('customerId', CUSTOMER_POPULATE)
    .lean()
  res.json(tractors.map(t => ({ ...t, status: deriveStatus(t) })))
}

export async function search(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  if (!q) { res.json([]); return }
  const tractors = await TractorAsset.find({
    $or: [
      { chassisNo: { $regex: q, $options: 'i' } },
      { engineNo:  { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean()
  res.json(tractors)
}

export async function getById(req: Request, res: Response) {
  const tractor = await TractorAsset.findById(req.params.id).populate('customerId', CUSTOMER_POPULATE).lean()
  if (!tractor) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  res.json({ ...tractor, status: deriveStatus(tractor) })
}

export async function create(req: Request, res: Response) {
  const {
    tractorModel, chassisNo, engineNo, hmr, dispatchDate, invoiceNo, invoiceDate,
    registrationNo, customerId, pdiDate, dateOfSale, dealerName, address,
  } = req.body as {
    tractorModel?: string; chassisNo?: string; engineNo?: string; hmr?: number
    dispatchDate?: string; invoiceNo?: string; invoiceDate?: string
    registrationNo?: string; customerId?: string; pdiDate?: string; dateOfSale?: string
    dealerName?: string; address?: Record<string, string>
  }

  if (!tractorModel?.trim() || !chassisNo?.trim() || !engineNo?.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'model, chassisNo and engineNo are required' } }); return
  }

  try {
    const tractor = await TractorAsset.create({
      tractorModel:   tractorModel.trim(),
      chassisNo:      chassisNo.trim(),
      engineNo:       engineNo.trim(),
      hmr,
      dispatchDate:   dispatchDate ? new Date(dispatchDate) : undefined,
      invoiceNo,
      invoiceDate:    invoiceDate ? new Date(invoiceDate) : undefined,
      registrationNo,
      customerId:     customerId || undefined,
      pdiDate:        pdiDate ? new Date(pdiDate) : undefined,
      dateOfSale:     dateOfSale ? new Date(dateOfSale) : undefined,
      dealerName,
      address,
    })

    void logChange({
      entityType: 'tractor_asset', entityId: tractor._id.toString(), entityLabel: `${tractor.chassisNo} — ${tractor.tractorModel}`,
      category: 'tractor_info', action: 'created', changes: [], by: null,
    })

    res.status(201).json(tractor)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Chassis number already exists' } }); return
    }
    throw err
  }
}

const WRITABLE_FIELDS = [
  'tractorModel', 'chassisNo', 'engineNo', 'hmr', 'dispatchDate', 'invoiceNo', 'invoiceDate',
  'registrationNo', 'customerId', 'pdiDate', 'dateOfSale', 'dealerName', 'address',
] as const

const DATE_FIELDS = new Set(['dispatchDate', 'invoiceDate', 'pdiDate', 'dateOfSale'])

export async function update(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>
  const before = await TractorAsset.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const upd: Record<string, unknown> = {}
  for (const key of WRITABLE_FIELDS) {
    if (body[key] === undefined) continue
    if (DATE_FIELDS.has(key) && body[key]) upd[key] = new Date(body[key] as string)
    else upd[key] = body[key]
  }
  if (typeof upd.tractorModel === 'string') upd.tractorModel = upd.tractorModel.trim()
  if (typeof upd.chassisNo === 'string')    upd.chassisNo    = upd.chassisNo.trim()
  if (typeof upd.engineNo === 'string')     upd.engineNo     = upd.engineNo.trim()

  let tractor
  try {
    tractor = await TractorAsset.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }).lean()
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Chassis number already exists' } }); return
    }
    throw err
  }
  if (!tractor) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const changes = diffFields(before as unknown as Record<string, unknown>, tractor as unknown as Record<string, unknown>, TRACTOR_FIELDS)
  void logChange({
    entityType:  'tractor_asset',
    entityId:    req.params.id,
    entityLabel: `${tractor.chassisNo} — ${tractor.tractorModel}`,
    category:    'tractor_info',
    action:      'updated',
    changes,
    by:          null,
  })

  res.json(tractor)
}

export async function remove(req: Request, res: Response) {
  const tractor = await TractorAsset.findById(req.params.id).lean()
  if (!tractor) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  await TractorAsset.findByIdAndDelete(req.params.id)

  void logChange({
    entityType:  'tractor_asset',
    entityId:    req.params.id,
    entityLabel: `${tractor.chassisNo} — ${tractor.tractorModel}`,
    category:    'tractor_info',
    action:      'deleted',
    changes:     [],
    by:          null,
  })

  res.status(204).end()
}
