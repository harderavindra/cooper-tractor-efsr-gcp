import type { Request, Response } from 'express'
import { Customer } from '../models/Customer'
import { logChange, diffFields, CUSTOMER_FIELDS } from '../utils/changeLog'

export async function list(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  const filter = q
    ? { $or: [
        { fullName:           { $regex: q, $options: 'i' } },
        { primaryContactNo:   { $regex: q, $options: 'i' } },
        { alternateContactNo: { $regex: q, $options: 'i' } },
      ] }
    : {}
  const customers = await Customer.find(filter).sort({ fullName: 1 }).lean()
  res.json(customers)
}

export async function search(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim()
  if (!q) { res.json([]); return }
  const customers = await Customer.find({
    $or: [
      { fullName:         { $regex: q, $options: 'i' } },
      { primaryContactNo: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean()
  res.json(customers)
}

export async function getById(req: Request, res: Response) {
  const customer = await Customer.findById(req.params.id).lean()
  if (!customer) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }
  res.json(customer)
}

export async function create(req: Request, res: Response) {
  const {
    fullName, gender, dob, address,
    primaryContactName, primaryContactNo, alternateContactName, alternateContactNo,
  } = req.body as {
    fullName?: string; gender?: 'Male' | 'Female' | 'Other'; dob?: string
    address?: { line1?: string; line2?: string; city?: string; taluk?: string; district?: string; state?: string; pinCode?: string }
    primaryContactName?: string; primaryContactNo?: string; alternateContactName?: string; alternateContactNo?: string
  }

  if (!fullName?.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'fullName is required' } }); return
  }

  const customer = await Customer.create({
    fullName: fullName.trim(),
    gender:   gender || undefined,
    dob:      dob ? new Date(dob) : undefined,
    address,
    primaryContactName,
    primaryContactNo,
    alternateContactName,
    alternateContactNo,
  })

  void logChange({
    entityType: 'customer', entityId: customer._id.toString(), entityLabel: customer.fullName,
    category: 'customer_info', action: 'created', changes: [], by: null,
  })

  res.status(201).json(customer)
}

const WRITABLE_FIELDS = [
  'fullName', 'gender', 'dob', 'address',
  'primaryContactName', 'primaryContactNo', 'alternateContactName', 'alternateContactNo',
] as const

export async function update(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>
  const before = await Customer.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const upd: Record<string, unknown> = {}
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) upd[key] = body[key]
  }
  if (typeof upd.fullName === 'string') upd.fullName = upd.fullName.trim()
  if (typeof upd.dob === 'string') upd.dob = new Date(upd.dob as string)

  const customer = await Customer.findByIdAndUpdate(req.params.id, upd, { new: true, runValidators: true }).lean()
  if (!customer) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  const changes = diffFields(before as unknown as Record<string, unknown>, customer as unknown as Record<string, unknown>, CUSTOMER_FIELDS)
  void logChange({
    entityType:  'customer',
    entityId:    req.params.id,
    entityLabel: customer.fullName,
    category:    'customer_info',
    action:      'updated',
    changes,
    by:          null,
  })

  res.json(customer)
}

export async function remove(req: Request, res: Response) {
  const customer = await Customer.findById(req.params.id).lean()
  if (!customer) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }); return }

  await Customer.findByIdAndDelete(req.params.id)

  void logChange({
    entityType:  'customer',
    entityId:    req.params.id,
    entityLabel: customer.fullName,
    category:    'customer_info',
    action:      'deleted',
    changes:     [],
    by:          null,
  })

  res.status(204).end()
}
