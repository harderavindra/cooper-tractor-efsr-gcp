import type { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import LocationMaster from '../models/LocationMaster'
import { Area } from '../models/Area'

const AREA_POPULATE = { path: 'areaId', select: 'name regionId', populate: { path: 'regionId', select: 'name' } }

export async function distinct(req: Request, res: Response) {
  const { field, state, district } = req.query as Record<string, string | undefined>
  const allowed = ['state', 'district', 'taluka']
  if (!field || !allowed.includes(field)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid field. Use state, district, or taluka' } }); return
  }
  const filter: Record<string, unknown> = { [field]: { $nin: ['', null] } }
  if (state?.trim())    filter.state    = state.trim()
  if (district?.trim()) filter.district = district.trim()
  const values = await LocationMaster.distinct(field, filter)
  res.json((values as string[]).filter(Boolean).sort())
}

export async function list(req: Request, res: Response) {
  const { pincode, q, page, limit, state, areaId, regionId } = req.query as Record<string, string | undefined>

  if (pincode) {
    const record = await LocationMaster.findOne({ pincode: pincode.trim() }).populate(AREA_POPULATE).lean()
    res.json(record ?? null); return
  }

  const pageNum  = Math.max(1, parseInt(page  ?? '1',  10))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10)))
  const skip     = (pageNum - 1) * limitNum

  const filter: Record<string, unknown> = {}
  if (q?.trim()) {
    filter.$or = [
      { pincode:     { $regex: q.trim(), $options: 'i' } },
      { post_office: { $regex: q.trim(), $options: 'i' } },
      { district:    { $regex: q.trim(), $options: 'i' } },
      { state:       { $regex: q.trim(), $options: 'i' } },
    ]
  }
  if (state?.trim())  filter.state  = state.trim()
  if (areaId?.trim()) {
    filter.areaId = areaId.trim()
  } else if (regionId?.trim()) {
    const areas = await Area.find({ regionId: regionId.trim() }, '_id').lean()
    filter.areaId = { $in: areas.map(a => a._id) }
  }

  const [records, total] = await Promise.all([
    LocationMaster.find(filter).populate(AREA_POPULATE).sort({ pincode: 1 }).skip(skip).limit(limitNum).lean(),
    LocationMaster.countDocuments(filter),
  ])

  res.json({ records, total, page: pageNum, limit: limitNum })
}

export async function create(req: Request, res: Response) {
  const { pincode, post_office, taluka, district, state, areaId } = req.body as Record<string, string | undefined>
  if (!pincode?.trim()) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'pincode is required' } }); return }
  try {
    const doc    = await LocationMaster.create({ pincode: pincode.trim(), post_office, taluka, district, state, areaId: areaId || null })
    const record = await LocationMaster.findById(doc._id).populate(AREA_POPULATE).lean()
    res.status(201).json(record)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Pincode already exists' } }); return
    }
    throw err
  }
}

export async function update(req: Request, res: Response) {
  const { pincode, post_office, taluka, district, state, areaId } = req.body as Record<string, string | undefined>
  const upd: Record<string, unknown> = {}
  if (pincode     !== undefined) upd.pincode     = pincode.trim()
  if (post_office !== undefined) upd.post_office = post_office
  if (taluka      !== undefined) upd.taluka      = taluka
  if (district    !== undefined) upd.district    = district
  if (state       !== undefined) upd.state       = state
  if (areaId      !== undefined) upd.areaId      = areaId || null
  try {
    await LocationMaster.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true })
    const record = await LocationMaster.findById(req.params.id).populate(AREA_POPULATE).lean()
    if (!record) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } }); return }
    res.json(record)
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Pincode already exists' } }); return
    }
    throw err
  }
}

export async function remove(req: Request, res: Response) {
  const record = await LocationMaster.findByIdAndDelete(req.params.id).lean()
  if (!record) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } }); return }
  res.status(204).end()
}

export async function importFile(req: Request, res: Response) {
  if (!req.file) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } }); return }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
  const sheet    = workbook.Sheets[workbook.SheetNames[0]]
  const rows     = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  function col(row: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()]
      if (v !== undefined && v !== '') return String(v).trim()
    }
    return ''
  }

  type BulkOp = { updateOne: { filter: Record<string, string>; update: { $set: Record<string, string> }; upsert: boolean } }
  const ops: BulkOp[] = []
  let skipped = 0

  for (const row of rows) {
    const pincode = col(row, 'Pincode', 'pincode', 'PIN Code', 'Pin Code', 'PINCODE', 'PIN', 'pin')
    if (!/^\d{6}$/.test(pincode)) { skipped++; continue }
    ops.push({
      updateOne: {
        filter: { pincode },
        update: {
          $set: {
            pincode,
            post_office: col(row, 'OfficeName', 'officename', 'post_office', 'Post Office', 'PostOffice'),
            taluka:      col(row, 'Taluk', 'taluk', 'taluka', 'Taluka'),
            district:    col(row, 'DistrictName', 'districtname', 'district', 'District', 'Dist', 'DIST'),
            state:       col(row, 'StateName', 'statename', 'state', 'State'),
          },
        },
        upsert: true,
      },
    })
  }

  if (ops.length === 0) {
    res.status(400).json({ message: 'No valid PIN codes found in file', skipped }); return
  }

  const result = await LocationMaster.bulkWrite(ops)
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, skipped, total: rows.length })
}

export async function assignArea(req: Request, res: Response) {
  const { state, district, taluka, areaId, preview } = req.body as {
    state?: string; district?: string; taluka?: string; areaId?: string; preview?: boolean
  }
  const filter: Record<string, string> = {}
  if (state?.trim())    filter.state    = state.trim()
  if (district?.trim()) filter.district = district.trim()
  if (taluka?.trim())   filter.taluka   = taluka.trim()
  if (Object.keys(filter).length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one filter (state, district, or taluka) is required' } }); return
  }
  if (preview) {
    const matched = await LocationMaster.countDocuments(filter)
    res.json({ matched }); return
  }
  if (!areaId?.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'areaId is required' } }); return
  }
  const result = await LocationMaster.updateMany(filter, { $set: { areaId: areaId.trim() } })
  res.json({ matched: result.matchedCount, modified: result.modifiedCount })
}

export async function bulk(req: Request, res: Response) {
  const { records } = req.body as { records?: Array<Record<string, string>> }
  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'records array is required' } }); return
  }
  const ops = records
    .filter(r => r.pincode?.trim())
    .map(r => ({
      updateOne: {
        filter: { pincode: r.pincode.trim() },
        update: { $set: r },
        upsert: true,
      },
    }))
  const result = await LocationMaster.bulkWrite(ops)
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount, total: ops.length })
}
