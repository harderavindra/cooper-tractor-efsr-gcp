import type { Response } from 'express'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { User, type UserRoleValue } from '../models/User'
import { Region } from '../models/Region'
import { Area } from '../models/Area'
import LocationMaster from '../models/LocationMaster'
import { useGCS, uploadToGCS, deleteFromGCS, gcsPathFromUrl } from '../lib/gcs'
import type { AuthRequest } from '../middleware/requireAuth'
import {
  logChange, diffFields,
  USER_PROFILE_FIELDS, USER_ROLE_FIELDS, USER_STATUS_FIELDS, USER_HIERARCHY_FIELDS,
} from '../utils/changeLog'
import { canManageUser, canAssignManagers, getSubordinateUserIds, SUBORDINATE_ROLES } from '../utils/userHierarchy'

const USER_SELECT = 'username name role dealerName employeeId email mobile address regionId areaIds areaManagerIds serviceEngineerIds serviceTechnicianIds dealerId pincodes designation vendorCode dealerType status profilePic createdAt updatedAt regionHistory areaHistory lockoutUntil'

const MANAGER_ACTOR_ROLES: UserRoleValue[] = ['rsm', 'area_manager', 'service_engineer', 'service_technician']

export async function list(req: AuthRequest, res: Response) {
  const rolesRaw   = req.query.roles
  const rolesParam = Array.isArray(rolesRaw)
    ? (rolesRaw as string[])
    : typeof rolesRaw === 'string' ? rolesRaw.split(',').map(r => r.trim()) : undefined

  if (req.user?.role === 'dealer') {
    const users = await User.find({ role: 'mechanic', dealerName: req.user.dealerName })
      .select(USER_SELECT).sort({ name: 1 }).lean()
    res.json(users); return
  }

  if (req.user?.role === 'mechanic') {
    // Mechanics have no subordinates in the hierarchy — without this branch,
    // they'd fall through to the unscoped "list everyone" path below.
    const self = await User.findById(req.user.userId).select(USER_SELECT).lean()
    res.json(self ? [self] : []); return
  }

  if (req.user && MANAGER_ACTOR_ROLES.includes(req.user.role)) {
    if (rolesParam?.length === 1 && rolesParam[0] === req.user.role) {
      const self = await User.findById(req.user.userId).select(USER_SELECT).lean()
      res.json(self ? [self] : []); return
    }
    const allowed = SUBORDINATE_ROLES[req.user.role] ?? []
    const roles = rolesParam?.length
      ? (rolesParam as UserRoleValue[]).filter(r => allowed.includes(r))
      : allowed

    const subIds = await getSubordinateUserIds(req.user)
    const scope   = subIds === 'ALL' ? {} : { _id: { $in: [...subIds].map(id => new Types.ObjectId(id)) } }
    const users = await User.find({ ...scope, role: { $in: roles } })
      .select(USER_SELECT).sort({ role: 1, name: 1 }).lean()
    res.json(users); return
  }

  const validRoles = rolesParam?.length ? (rolesParam as UserRoleValue[]) : undefined
  const filter     = validRoles ? { role: { $in: validRoles } } : {}
  type EnrichedUser = { role: string; areaIds?: Types.ObjectId[]; areaNames?: string[]; regionNames?: string[]; [k: string]: unknown }
  const users = (await User.find(filter).select(USER_SELECT).sort({ role: 1, name: 1 }).lean()) as unknown as EnrichedUser[]

  const amUsers = users.filter(u => u.role === 'area_manager' && (u.areaIds?.length ?? 0) > 0)
  if (amUsers.length > 0) {
    const allAreaIds = [...new Set(amUsers.flatMap(u => (u.areaIds ?? []).map(id => id.toString())))]
    const areas = await Area.find({ _id: { $in: allAreaIds.map(id => new Types.ObjectId(id)) } }, 'name regionId')
      .populate<{ regionId: { name: string } | null }>('regionId', 'name').lean()
    const areaMap = new Map(areas.map(a => [
      a._id.toString(),
      { name: a.name as string, regionName: (a.regionId as { name?: string } | null)?.name ?? '' },
    ]))

    for (const u of amUsers) {
      const info = (u.areaIds ?? []).map(id => areaMap.get(id.toString())).filter(Boolean) as { name: string; regionName: string }[]
      u.areaNames   = info.map(a => a.name)
      u.regionNames = [...new Set(info.map(a => a.regionName).filter(Boolean))]
    }
  }

  res.json(users)
}

export async function availablePincodes(req: AuthRequest, res: Response) {
  const { excludeUserId } = req.query as Record<string, string | undefined>

  const all = await LocationMaster
    .find({}, 'pincode post_office taluka district state')
    .sort({ state: 1, district: 1, pincode: 1 }).lean()

  const takenFilter: Record<string, unknown> = { role: 'dealer', pincodes: { $not: { $size: 0 } } }
  if (excludeUserId?.trim()) takenFilter._id = { $ne: excludeUserId.trim() }
  const dealers  = await User.find(takenFilter, 'name pincodes').lean()
  const takenMap = new Map<string, string>()
  for (const d of dealers) {
    for (const pin of d.pincodes ?? []) takenMap.set(pin, d.name)
  }

  res.json(all.map(p => ({
    pincode:     p.pincode,
    post_office: p.post_office ?? '',
    taluka:      p.taluka      ?? '',
    district:    p.district    ?? '',
    state:       p.state       ?? '',
    taken:       takenMap.has(p.pincode),
    takenBy:     takenMap.get(p.pincode) ?? null,
  })))
}

export async function create(req: AuthRequest, res: Response) {
  const {
    name, password, role, dealerName, employeeId, email, mobile,
    address, areaIds: rawAreaIds, areaManagerIds: rawAMIds,
    serviceEngineerIds: rawSEIds, serviceTechnicianIds: rawSTIds,
    dealerId, regionId, status,
    designation, vendorCode, dealerType,
  } = req.body as {
    name?: string; password?: string
    role?: UserRoleValue; dealerName?: string; employeeId?: string; email?: string; mobile?: string
    address?: { line1?: string; city?: string; district?: string; state?: string; pinCode?: string }
    areaIds?: string[]; areaManagerIds?: string[]
    serviceEngineerIds?: string[]; serviceTechnicianIds?: string[]
    dealerId?: string; regionId?: string
    status?: 'active' | 'inactive' | 'archived'
    designation?: string; vendorCode?: string; dealerType?: string
  }
  const areaIds        = Array.isArray(rawAreaIds) ? rawAreaIds.filter(Boolean) : []
  const areaManagerIds = Array.isArray(rawAMIds)   ? rawAMIds.filter(Boolean)   : []
  const serviceEngineerIds   = Array.isArray(rawSEIds) ? rawSEIds.filter(Boolean) : []
  const serviceTechnicianIds = Array.isArray(rawSTIds) ? rawSTIds.filter(Boolean) : []

  const derivedUsername = (email?.toLowerCase().trim() || mobile?.trim() || '')
  if (!name || !derivedUsername || !password || !role) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, email or mobile, password, and role are required' } }); return
  }

  if (req.user?.role === 'dealer') {
    if (role !== 'mechanic') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Dealers can only create mechanic accounts' } }); return
    }
    const resolvedDealerName = req.user.dealerName
    if (!resolvedDealerName) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Dealer account is missing dealerName' } }); return
    }
    const existing = await User.findOne({ username: derivedUsername }).lean()
    if (existing) { res.status(409).json({ error: { code: 'CONFLICT', message: 'Email / mobile already registered' } }); return }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
      name, username: derivedUsername, passwordHash, role: 'mechanic',
      dealerName: resolvedDealerName,
      dealerId:   req.user.userId,
      areaIds:    req.user.areaIds ?? [],
      email: email || undefined, mobile: mobile || undefined, address,
    })
    const { passwordHash: _, ...safe } = user.toObject()

    void logChange({
      entityType: 'user', entityId: user._id.toString(), entityLabel: name,
      category: 'user_profile', action: 'created', changes: [],
      by: { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role },
    })

    res.status(201).json(safe); return
  }

  if (req.user && MANAGER_ACTOR_ROLES.includes(req.user.role)) {
    const allowedRoles = SUBORDINATE_ROLES[req.user.role] ?? []
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot create user outside your hierarchy' } }); return
    }
    let ok = false
    if (role === 'area_manager') {
      const area = areaIds[0] ? await Area.findById(areaIds[0], 'regionId').lean() : null
      ok = !!(req.user.regionId && area?.regionId?.toString() === req.user.regionId)
    } else if (role === 'service_engineer') {
      ok = await canAssignManagers(req.user, areaManagerIds)
    } else if (role === 'service_technician') {
      ok = await canAssignManagers(req.user, serviceEngineerIds)
    } else if (role === 'dealer') {
      ok = await canAssignManagers(req.user, serviceTechnicianIds)
    } else if (role === 'mechanic') {
      ok = dealerId ? await canAssignManagers(req.user, [dealerId]) : false
    }
    if (!ok) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot create user outside your hierarchy' } }); return }
  }

  if ((role === 'dealer' || role === 'mechanic') && !dealerName) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'dealerName is required for dealer/mechanic roles' } }); return
  }
  const existing = await User.findOne({ username: derivedUsername }).lean()
  if (existing) { res.status(409).json({ error: { code: 'CONFLICT', message: 'Email / mobile already registered' } }); return }
  const passwordHash = await bcrypt.hash(password, 10)

  let resolvedDealerName = dealerName
  let resolvedAreaIds    = areaIds
  if (role === 'mechanic' && dealerId) {
    const dealer = await User.findById(dealerId).lean()
    if (dealer?.dealerName) resolvedDealerName = dealer.dealerName
    if (dealer?.areaIds?.length) resolvedAreaIds = dealer.areaIds.map(id => id.toString())
  }

  const user = await User.create({
    name, username: derivedUsername, passwordHash, role,
    dealerName:      resolvedDealerName,
    employeeId:      employeeId  || undefined,
    email:           email       || undefined,
    mobile:          mobile      || undefined,
    designation:     designation || undefined,
    vendorCode:      vendorCode  || undefined,
    dealerType:      dealerType  || undefined,
    address,
    regionId:             role === 'rsm'               ? (regionId || undefined) : undefined,
    areaIds:              role === 'area_manager'      ? resolvedAreaIds       : [],
    areaManagerIds:       role === 'service_engineer'  ? areaManagerIds       : [],
    serviceEngineerIds:   role === 'service_technician'? serviceEngineerIds   : [],
    serviceTechnicianIds: role === 'dealer'            ? serviceTechnicianIds : [],
    dealerId:       dealerId || undefined,
    status:         status ?? 'active',
  })

  const assignedBy = req.user ? { userId: req.user.userId, userName: req.user.name } : undefined
  try {
    const now = new Date()
    if (role === 'rsm' && regionId) {
      const region = await Region.findById(regionId).lean()
      if (region?.managerId) {
        await User.updateOne(
          { _id: region.managerId },
          { $unset: { regionId: 1 }, $set: { 'regionHistory.$[open].unassignedAt': now } },
          { arrayFilters: [{ 'open.unassignedAt': { $exists: false } }], strict: false }
        )
      }
      await User.findByIdAndUpdate(user._id, {
        $push: { regionHistory: { regionId, regionName: region?.name ?? '', assignedAt: now, assignedBy } },
      })
      await Region.findByIdAndUpdate(regionId, { managerId: user._id })
    }
    if (role === 'area_manager' && resolvedAreaIds.length) {
      for (const aid of resolvedAreaIds) {
        const area = await Area.findById(aid).lean()
        await User.findByIdAndUpdate(user._id, {
          $push: { areaHistory: { areaId: aid, areaName: area?.name ?? '', assignedAt: now, assignedBy } },
        })
        await Area.findByIdAndUpdate(aid, { $addToSet: { managerIds: user._id } })
      }
    }
  } catch (histErr) {
    console.error('[users.create] history/region update failed:', histErr)
  }

  void logChange({
    entityType: 'user', entityId: user._id.toString(), entityLabel: name,
    category: 'user_profile', action: 'created', changes: [],
    by: req.user ? { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role } : null,
  })

  const { passwordHash: _, ...safe } = user.toObject()
  res.status(201).json(safe)
}

export async function update(req: AuthRequest, res: Response) {
  const {
    name, role, dealerName, employeeId, email, mobile,
    address, areaIds: rawAreaIds, areaManagerIds: rawAMIds,
    serviceEngineerIds: rawSEIds, serviceTechnicianIds: rawSTIds,
    dealerId, regionId, status,
    designation, vendorCode, dealerType,
  } = req.body as {
    name?: string; role?: UserRoleValue; dealerName?: string; employeeId?: string; email?: string; mobile?: string
    address?: { line1?: string; city?: string; district?: string; state?: string; pinCode?: string }
    areaIds?: string[]; areaManagerIds?: string[]
    serviceEngineerIds?: string[]; serviceTechnicianIds?: string[]
    dealerId?: string; regionId?: string
    status?: 'active' | 'inactive' | 'archived'
    designation?: string; vendorCode?: string; dealerType?: string
  }
  const areaIds        = Array.isArray(rawAreaIds) ? rawAreaIds.filter(Boolean) : []
  const areaManagerIds = Array.isArray(rawAMIds)   ? rawAMIds.filter(Boolean)   : []
  const serviceEngineerIds   = Array.isArray(rawSEIds) ? rawSEIds.filter(Boolean) : []
  const serviceTechnicianIds = Array.isArray(rawSTIds) ? rawSTIds.filter(Boolean) : []
  const newEmail   = email?.toLowerCase().trim()  || ''
  const newMobile  = mobile?.trim() || ''
  const newUsername = newEmail || newMobile

  if (req.user?.role === 'dealer') {
    const target = await User.findById(req.params.id).lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    if (target.role !== 'mechanic' || target.dealerName !== req.user.dealerName) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: not your mechanic' } }); return
    }
    const dealerUpdate: Record<string, unknown> = { name, address }
    if (newEmail)  { dealerUpdate.email  = newEmail;  dealerUpdate.username = newEmail  }
    if (newMobile) { dealerUpdate.mobile = newMobile; if (!newEmail) dealerUpdate.username = newMobile }
    const updated = await User.findByIdAndUpdate(req.params.id, dealerUpdate, { new: true }).select('-passwordHash').lean()
    res.json(updated); return
  }

  if (req.user && MANAGER_ACTOR_ROLES.includes(req.user.role)) {
    const target = await User.findById(req.params.id, 'role').lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    const ok = await canManageUser(req.user, req.params.id, target.role)
    if (!ok) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot edit user outside your hierarchy' } }); return }
  }

  // Fetch BEFORE for diff
  const before = await User.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  let resolvedDealerName = dealerName
  let resolvedAreaIds    = areaIds
  if (role === 'mechanic' && dealerId) {
    const dealer = await User.findById(dealerId).lean()
    if (dealer?.dealerName)   resolvedDealerName = dealer.dealerName
    if (dealer?.areaIds?.length) resolvedAreaIds = dealer.areaIds.map(id => id.toString())
  }

  const updateDoc: Record<string, unknown> = {
    name, role,
    dealerName:  resolvedDealerName,
    employeeId:  employeeId  || undefined,
    email:       newEmail    || undefined,
    mobile:      newMobile   || undefined,
    designation: designation || undefined,
    vendorCode:  vendorCode  || undefined,
    dealerType:  dealerType  || undefined,
    address,
    regionId:             role === 'rsm'               ? (regionId || undefined) : undefined,
    areaIds:              role === 'area_manager'      ? resolvedAreaIds       : undefined,
    areaManagerIds:       role === 'service_engineer'  ? areaManagerIds       : undefined,
    serviceEngineerIds:   role === 'service_technician'? serviceEngineerIds   : undefined,
    serviceTechnicianIds: role === 'dealer'            ? serviceTechnicianIds : undefined,
    dealerId:       dealerId || undefined,
  }
  if (newUsername) updateDoc.username = newUsername
  if (status)      updateDoc.status   = status

  const user = await User.findByIdAndUpdate(req.params.id, updateDoc, { new: true, runValidators: true })
    .select('-passwordHash').lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  const assignedBy = req.user ? { userId: req.user.userId, userName: req.user.name } : undefined
  try {
    const now = new Date()
    if (role === 'rsm' && regionId !== undefined) {
      await User.updateOne(
        { _id: req.params.id },
        { $set: { 'regionHistory.$[open].unassignedAt': now } },
        { arrayFilters: [{ 'open.unassignedAt': { $exists: false } }], strict: false }
      )
      await Region.updateMany({ managerId: req.params.id }, { $unset: { managerId: 1 } })
      if (regionId) {
        const region = await Region.findById(regionId).lean()
        if (region?.managerId && region.managerId.toString() !== req.params.id) {
          await User.updateOne(
            { _id: region.managerId },
            { $unset: { regionId: 1 }, $set: { 'regionHistory.$[open].unassignedAt': now } },
            { arrayFilters: [{ 'open.unassignedAt': { $exists: false } }], strict: false }
          )
        }
        await User.findByIdAndUpdate(req.params.id, {
          $push: { regionHistory: { regionId, regionName: region?.name ?? '', assignedAt: now, assignedBy } },
        })
        await Region.findByIdAndUpdate(regionId, { managerId: req.params.id })
      }
    }
    if (role === 'area_manager' && rawAreaIds !== undefined) {
      const existingUser = await User.findById(req.params.id, 'areaIds').lean()
      const existingIds  = (existingUser?.areaIds ?? []).map(id => id.toString())
      const added        = resolvedAreaIds.filter(id => !existingIds.includes(id))
      const removed      = existingIds.filter(id => !resolvedAreaIds.includes(id))

      for (const aid of removed) {
        await Area.findByIdAndUpdate(aid, { $pull: { managerIds: req.params.id } })
        await User.updateOne(
          { _id: req.params.id, 'areaHistory.areaId': aid, 'areaHistory.unassignedAt': { $exists: false } },
          { $set: { 'areaHistory.$.unassignedAt': now } }
        )
      }
      for (const aid of added) {
        const area = await Area.findById(aid).lean()
        await User.findByIdAndUpdate(req.params.id, {
          $push: { areaHistory: { areaId: aid, areaName: area?.name ?? '', assignedAt: now, assignedBy } },
        })
        await Area.findByIdAndUpdate(aid, { $addToSet: { managerIds: req.params.id } })
      }
    }
  } catch (histErr) {
    console.error('[users.update] history/region update failed:', histErr)
  }

  // Diff and log after update
  const by = req.user
    ? { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role }
    : null
  const entityLabel = (user as { name?: string }).name ?? req.params.id
  const beforeRec = before as unknown as Record<string, unknown>
  const afterRec  = user  as unknown as Record<string, unknown>

  const profileChanges   = diffFields(beforeRec, afterRec, USER_PROFILE_FIELDS)
  const roleChanges      = diffFields(beforeRec, afterRec, USER_ROLE_FIELDS)
  const hierarchyChanges = diffFields(beforeRec, afterRec, USER_HIERARCHY_FIELDS)

  void logChange({ entityType: 'user', entityId: req.params.id, entityLabel, category: 'user_profile',   action: 'updated', changes: profileChanges,   by })
  void logChange({ entityType: 'user', entityId: req.params.id, entityLabel, category: 'user_role',      action: 'updated', changes: roleChanges,      by })
  void logChange({ entityType: 'user', entityId: req.params.id, entityLabel, category: 'user_hierarchy', action: 'updated', changes: hierarchyChanges, by })

  res.json(user)
}

export async function updatePassword(req: AuthRequest, res: Response) {
  const { newPassword } = req.body as { newPassword?: string }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } }); return
  }

  if (req.user?.role === 'dealer') {
    const target = await User.findById(req.params.id).lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    if (target.role !== 'mechanic' || target.dealerName !== req.user.dealerName) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: not your mechanic' } }); return
    }
  } else if (req.user && MANAGER_ACTOR_ROLES.includes(req.user.role)) {
    const target = await User.findById(req.params.id, 'role').lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    const ok = await canManageUser(req.user, req.params.id, target.role)
    if (!ok) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot change password for user outside your hierarchy' } }); return }
  }

  const target = await User.findById(req.params.id).select('+passwordHistory').lean()
  if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  for (const entry of target.passwordHistory ?? []) {
    if (await bcrypt.compare(newPassword, entry.hash)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cannot reuse a recent password' } }); return
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await User.findByIdAndUpdate(req.params.id, {
    passwordHash,
    passwordChangedAt: new Date(),
    $push: { passwordHistory: { $each: [{ hash: passwordHash, changedAt: new Date() }], $slice: -5 } },
  })

  void logChange({
    entityType:  'user',
    entityId:    req.params.id,
    entityLabel: (target as { name?: string }).name ?? req.params.id,
    category:    'user_profile',
    action:      'updated',
    changes:     [{ field: 'password', label: 'Password', from: '●●●●', to: '●●●●' }],
    by: req.user ? { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role } : null,
  })

  res.json({ message: 'Password updated', code: 'OK' })
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const { status } = req.body as { status?: 'active' | 'inactive' | 'archived' }
  if (!status || !['active', 'inactive', 'archived'].includes(status)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'status must be active, inactive, or archived' } }); return
  }
  if (req.params.id === req.user?.userId) {
    res.status(400).json({ error: { code: 'FORBIDDEN', message: 'Cannot change your own status' } }); return
  }
  if (req.user?.role === 'dealer') {
    const target = await User.findById(req.params.id).lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    if (target.role !== 'mechanic' || target.dealerName !== req.user.dealerName) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: not your mechanic' } }); return
    }
  } else if (req.user && MANAGER_ACTOR_ROLES.includes(req.user.role)) {
    const target = await User.findById(req.params.id, 'role').lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    const ok = await canManageUser(req.user, req.params.id, target.role)
    if (!ok) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot update user outside your hierarchy' } }); return }
  }

  const before = await User.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select(USER_SELECT).lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  const statusChanges = diffFields(
    before as unknown as Record<string, unknown>,
    user   as unknown as Record<string, unknown>,
    USER_STATUS_FIELDS
  )
  void logChange({
    entityType:  'user',
    entityId:    req.params.id,
    entityLabel: (user as { name?: string }).name ?? req.params.id,
    category:    'user_status',
    action:      'updated',
    changes:     statusChanges,
    by: req.user ? { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role } : null,
  })

  res.json(user)
}

export async function unlock(req: AuthRequest, res: Response) {
  const before = await User.findById(req.params.id).lean()
  if (!before) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { loginAttempts: 0, lockoutUntil: null },
    { new: true }
  ).select(USER_SELECT).lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  void logChange({
    entityType:  'user',
    entityId:    req.params.id,
    entityLabel: (user as { name?: string }).name ?? req.params.id,
    category:    'user_status',
    action:      'updated',
    changes:     [{ field: 'lockoutUntil', label: 'Account Lock', from: 'Locked', to: 'Unlocked' }],
    by: req.user ? { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role } : null,
  })

  res.json(user)
}

export async function remove(req: AuthRequest, res: Response) {
  if (req.params.id === req.user?.userId) {
    res.status(400).json({ error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' } }); return
  }

  if (req.user?.role === 'dealer') {
    const target = await User.findById(req.params.id).lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    if (target.role !== 'mechanic' || target.dealerName !== req.user.dealerName) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden: not your mechanic' } }); return
    }
  }

  if (req.user && MANAGER_ACTOR_ROLES.includes(req.user.role)) {
    const target = await User.findById(req.params.id, 'role').lean()
    if (!target) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
    const ok = await canManageUser(req.user, req.params.id, target.role)
    if (!ok) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot delete user outside your hierarchy' } }); return }
  }

  const user = await User.findById(req.params.id).lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  if (useGCS && user.profilePic?.startsWith('https://storage.googleapis.com/')) {
    try { await deleteFromGCS(gcsPathFromUrl(user.profilePic)) } catch { /* ignore */ }
  }

  await User.findByIdAndDelete(req.params.id)
  await Region.updateMany({ managerId: req.params.id }, { $unset: { managerId: 1 } })
  await Area.updateMany({ managerIds: req.params.id }, { $pull: { managerIds: user._id } })

  void logChange({
    entityType:  'user',
    entityId:    req.params.id,
    entityLabel: (user as { name?: string }).name ?? req.params.id,
    category:    'user_profile',
    action:      'deleted',
    changes:     [],
    by: req.user ? { userId: req.user.userId, name: req.user.name ?? '', role: req.user.role } : null,
  })

  res.status(204).end()
}

export async function confirmProfilePic(req: AuthRequest, res: Response) {
  if (req.params.id !== req.user!.userId && req.user!.role !== 'admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot modify another user\'s profile picture' } }); return
  }
  const { gcsUrl } = req.body as { gcsUrl?: string }
  if (!gcsUrl?.startsWith('https://storage.googleapis.com/')) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid gcsUrl' } }); return
  }
  const user = await User.findById(req.params.id).lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
  if (useGCS && user.profilePic?.startsWith('https://storage.googleapis.com/')) {
    try { await deleteFromGCS(gcsPathFromUrl(user.profilePic)) } catch { /* ignore */ }
  }
  await User.findByIdAndUpdate(req.params.id, { profilePic: gcsUrl })
  res.json({ profilePic: gcsUrl })
}

export async function uploadProfilePic(req: AuthRequest, res: Response) {
  if (req.params.id !== req.user!.userId && req.user!.role !== 'admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot modify another user\'s profile picture' } }); return
  }
  const file = req.file
  if (!file) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No image file provided' } }); return }

  const user = await User.findById(req.params.id).lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }

  if (useGCS && user.profilePic?.startsWith('https://storage.googleapis.com/')) {
    try { await deleteFromGCS(gcsPathFromUrl(user.profilePic)) } catch { /* ignore */ }
  }

  let profilePicUrl: string
  try {
    if (useGCS) {
      profilePicUrl = await uploadToGCS(file.buffer, 'profiles', `${req.params.id}.jpg`, 'image/jpeg')
    } else {
      res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'GCS not configured' } }); return
    }
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } }); return
  }

  await User.findByIdAndUpdate(req.params.id, { profilePic: profilePicUrl })
  res.json({ profilePic: profilePicUrl })
}

export async function deleteProfilePic(req: AuthRequest, res: Response) {
  if (req.params.id !== req.user!.userId && req.user!.role !== 'admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot modify another user\'s profile picture' } }); return
  }
  const user = await User.findById(req.params.id).lean()
  if (!user) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } }); return }
  if (useGCS && user.profilePic?.startsWith('https://storage.googleapis.com/')) {
    try { await deleteFromGCS(gcsPathFromUrl(user.profilePic)) } catch { /* ignore */ }
  }
  await User.findByIdAndUpdate(req.params.id, { $unset: { profilePic: 1 } })
  res.status(204).end()
}
