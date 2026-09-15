import type { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import { SapTractorAsset } from '../models/SapTractorAsset'
import { TractorAsset } from '../models/TractorAsset'

export async function list(req: Request, res: Response) {
  const q     = String(req.query.q ?? '').trim()
  const page  = Math.max(1, parseInt(String(req.query.page ?? '1'), 10))
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)))
  const skip  = (page - 1) * limit

  const filter = q
    ? { $or: [
        { chassisNo: { $regex: q, $options: 'i' } },
        { engineNo:  { $regex: q, $options: 'i' } },
        { tractorModel: { $regex: q, $options: 'i' } },
      ] }
    : {}

  const [rows, total] = await Promise.all([
    SapTractorAsset.find(filter).sort({ importedAt: -1 }).skip(skip).limit(limit).lean(),
    SapTractorAsset.countDocuments(filter),
  ])

  const chassisNos = rows.map(r => r.chassisNo)
  const registered = await TractorAsset.find({ chassisNo: { $in: chassisNos } }, 'chassisNo').lean()
  const registeredMap = new Map(registered.map(r => [r.chassisNo, r._id.toString()]))

  const data = rows.map(r => ({
    ...r,
    _status: {
      registered: registeredMap.has(r.chassisNo),
      tractorId:  registeredMap.get(r.chassisNo) ?? null,
    },
  }))

  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}

export async function getById(req: Request, res: Response) {
  const row = await SapTractorAsset.findById(req.params.id).lean()
  if (!row) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  res.json(row)
}

export async function search(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  if (!q) { res.json([]); return }
  const rows = await SapTractorAsset.find({
    $or: [
      { chassisNo: { $regex: q, $options: 'i' } },
      { engineNo:  { $regex: q, $options: 'i' } },
    ],
  }).limit(5).lean()
  res.json(rows)
}

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

function parseExcelDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d)
  }
  const s = String(value).trim()
  if (!s) return undefined
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? 2000 + Number(y) : Number(y)
    return new Date(year, Number(m) - 1, Number(d))
  }
  const parsed = new Date(s)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

export async function importFile(req: Request, res: Response) {
  if (!req.file) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } }); return }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
  const sheet    = workbook.Sheets[workbook.SheetNames[0]]
  const rows     = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  type BulkOp = { updateOne: { filter: Record<string, string>; update: { $set: Record<string, unknown> }; upsert: boolean } }
  const ops: BulkOp[] = []
  let skipped = 0

  rows.forEach((row, i) => {
    const chassisNo = col(row, 'Chassis No', 'Chassis No.', 'ChassisNo', 'Chassis Number')
    if (!chassisNo) { skipped++; return }

    const hmrRaw = col(row, 'HMR', 'Hour Meter Reading')

    ops.push({
      updateOne: {
        filter: { chassisNo },
        update: {
          $set: {
            chassisNo,
            srNo:           i + 1,
            tractorModel:   col(row, 'Model', 'Tractor Model'),
            engineNo:       col(row, 'Engine No', 'Engine No.', 'EngineNo', 'Engine Number'),
            hmr:            hmrRaw ? Number(hmrRaw) : undefined,
            dispatchDate:   parseExcelDate(col(row, 'Dispatch Date', 'DispatchDate')),
            invoiceNo:      col(row, 'Invoice No', 'Invoice No.', 'InvoiceNo'),
            invoiceDate:    parseExcelDate(col(row, 'Invoice Date', 'InvoiceDate')),
            registrationNo: col(row, 'Registration No', 'Registration No.', 'RegistrationNo'),
            customerName:   col(row, 'Customer Name', 'Customer'),
            customerPhone:  col(row, 'Customer Phone', 'Customer Contact', 'Customer No'),
            pdiDate:        parseExcelDate(col(row, 'PDI Date', 'PDIDate')),
            dateOfSale:     parseExcelDate(col(row, 'Date of Sale', 'DateOfSale', 'Sale Date')),
            dealerName:     col(row, 'Dealer', 'Dealer Name'),
            importedAt:     new Date(),
          },
        },
        upsert: true,
      },
    })
  })

  if (ops.length === 0) {
    res.status(400).json({ message: 'No valid rows found in file', skipped }); return
  }

  const result = await SapTractorAsset.bulkWrite(ops)
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, skipped, total: rows.length })
}

export async function remove(req: Request, res: Response) {
  const row = await SapTractorAsset.findById(req.params.id).lean()
  if (!row) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  await SapTractorAsset.findByIdAndDelete(req.params.id)
  res.status(204).end()
}

export async function removeAll(_req: Request, res: Response) {
  const result = await SapTractorAsset.deleteMany({})
  res.json({ deleted: result.deletedCount })
}
