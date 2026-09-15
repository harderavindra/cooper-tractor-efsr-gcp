import { Types } from 'mongoose'
import { User, type UserRoleValue } from '../models/User'
import { Area } from '../models/Area'
import type { AuthUser } from '../middleware/requireAuth'

/**
 * Walks the management chain
 *   rsm → area_manager → service_engineer → service_technician → dealer → mechanic
 * downward from the actor and returns every subordinate user id (as strings).
 * Returns 'ALL' for admin (unscoped).
 */
export async function getSubordinateUserIds(actor: AuthUser): Promise<Set<string> | 'ALL'> {
  if (actor.role === 'admin') return 'ALL'

  const ids = new Set<string>()

  let areaManagerIds: Types.ObjectId[] = []
  if (actor.role === 'rsm') {
    if (!actor.regionId) return ids
    const areas = await Area.find({ regionId: actor.regionId }, '_id').lean()
    const areaIds = areas.map(a => a._id)
    if (!areaIds.length) return ids
    const ams = await User.find({ role: 'area_manager', areaIds: { $in: areaIds } }, '_id').lean()
    areaManagerIds = ams.map(u => u._id)
    for (const id of areaManagerIds) ids.add(id.toString())
  } else if (actor.role === 'area_manager') {
    areaManagerIds = [new Types.ObjectId(actor.userId)]
  }

  let serviceEngineerIds: Types.ObjectId[] = []
  if (actor.role === 'rsm' || actor.role === 'area_manager') {
    if (!areaManagerIds.length) return ids
    const ses = await User.find({ role: 'service_engineer', areaManagerIds: { $in: areaManagerIds } }, '_id').lean()
    serviceEngineerIds = ses.map(u => u._id)
    for (const id of serviceEngineerIds) ids.add(id.toString())
  } else if (actor.role === 'service_engineer') {
    serviceEngineerIds = [new Types.ObjectId(actor.userId)]
  }

  let serviceTechnicianIds: Types.ObjectId[] = []
  if (actor.role === 'rsm' || actor.role === 'area_manager' || actor.role === 'service_engineer') {
    if (!serviceEngineerIds.length) return ids
    const sts = await User.find({ role: 'service_technician', serviceEngineerIds: { $in: serviceEngineerIds } }, '_id').lean()
    serviceTechnicianIds = sts.map(u => u._id)
    for (const id of serviceTechnicianIds) ids.add(id.toString())
  } else if (actor.role === 'service_technician') {
    serviceTechnicianIds = [new Types.ObjectId(actor.userId)]
  }

  let dealerIds: Types.ObjectId[] = []
  if (actor.role === 'rsm' || actor.role === 'area_manager' || actor.role === 'service_engineer' || actor.role === 'service_technician') {
    if (!serviceTechnicianIds.length) return ids
    const dealers = await User.find({ role: 'dealer', serviceTechnicianIds: { $in: serviceTechnicianIds } }, '_id').lean()
    dealerIds = dealers.map(d => d._id)
    for (const id of dealerIds) ids.add(id.toString())
  } else if (actor.role === 'dealer') {
    dealerIds = [new Types.ObjectId(actor.userId)]
  }

  if (actor.role === 'dealer') {
    // Preserves the existing dealerName-based match dealers already use for their own mechanics.
    const mechanics = await User.find({ role: 'mechanic', dealerName: actor.dealerName }, '_id').lean()
    for (const m of mechanics) ids.add(m._id.toString())
  } else if (dealerIds.length) {
    const mechanics = await User.find({ role: 'mechanic', dealerId: { $in: dealerIds } }, '_id').lean()
    for (const m of mechanics) ids.add(m._id.toString())
  }

  return ids
}

export const SUBORDINATE_ROLES: Record<string, UserRoleValue[]> = {
  rsm:                ['area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic'],
  area_manager:       ['service_engineer', 'service_technician', 'dealer', 'mechanic'],
  service_engineer:   ['service_technician', 'dealer', 'mechanic'],
  service_technician: ['dealer', 'mechanic'],
}

export async function canManageUser(actor: AuthUser, targetUserId: string, targetRole?: UserRoleValue): Promise<boolean> {
  if (actor.role === 'admin') return true
  if (actor.role === 'dealer') return targetRole === 'mechanic'

  const allowed = SUBORDINATE_ROLES[actor.role] ?? []
  if (targetRole && !allowed.includes(targetRole)) return false

  const subordinateIds = await getSubordinateUserIds(actor)
  if (subordinateIds === 'ALL') return true
  return subordinateIds.has(targetUserId)
}

/**
 * For create(): the target doesn't exist yet, so there's no id to check against
 * getSubordinateUserIds. Instead, verify at least one of the new user's proposed
 * "reports to" ids (areaManagerIds/serviceEngineerIds/serviceTechnicianIds/dealerId)
 * is the actor themselves or already within the actor's subtree.
 */
export async function canAssignManagers(actor: AuthUser, proposedManagerIds: string[]): Promise<boolean> {
  if (actor.role === 'admin') return true
  if (!proposedManagerIds.length) return false
  if (proposedManagerIds.includes(actor.userId)) return true

  const subordinateIds = await getSubordinateUserIds(actor)
  if (subordinateIds === 'ALL') return true
  return proposedManagerIds.some(id => subordinateIds.has(id))
}
