import type { Response } from 'express'
import { PdiEntry } from '../models/PdiEntry'
import { User } from '../models/User'
import { getSubordinateUserIds } from '../utils/userHierarchy'
import { withChecklistDefaults } from './pdiEntries'
import type { AuthRequest } from '../middleware/requireAuth'

const POPULATE_TRACTOR = 'tractorModel chassisNo engineNo'

export async function getDashboard(req: AuthRequest, res: Response) {
  const actor = req.user!
  const subIds = await getSubordinateUserIds(actor)

  // admin/rsm never reach /mobile in practice; treat 'ALL' as "no team scope"
  // rather than building an unbounded org-wide query.
  const hasTeam = subIds !== 'ALL' && subIds.size > 0
  const poolIds = subIds === 'ALL' ? [actor.userId] : [actor.userId, ...subIds]
  const idFilter = { 'assignedTo.userId': { $in: poolIds } }

  const [activeTasksRaw, recentCompletedRaw, completedCount] = await Promise.all([
    PdiEntry.find({ ...idFilter, status: { $ne: 'completed' } })
      .sort({ pdiDate: 1, createdAt: 1 })
      .populate('tractorId', POPULATE_TRACTOR)
      .lean(),
    PdiEntry.find({ ...idFilter, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate('tractorId', POPULATE_TRACTOR)
      .lean(),
    PdiEntry.countDocuments({ ...idFilter, status: 'completed' }),
  ])

  const activeTasks = activeTasksRaw.map(withChecklistDefaults)
  const recentCompleted = recentCompletedRaw.map(withChecklistDefaults)

  const counts = {
    active: activeTasks.length,
    completed: completedCount,
    total: activeTasks.length + completedCount,
  }

  let team: { _id: string; name: string; role: string; dealerName?: string; profilePic?: string; activeCount: number }[] = []
  let summary: { myActive: number; teamActive: number; myCompleted: number } | undefined

  if (hasTeam) {
    const subIdList = [...subIds as Set<string>]

    const [teamUsers, activeCountRows, myCompleted] = await Promise.all([
      User.find({ _id: { $in: subIdList } }, 'name role dealerName profilePic').lean(),
      PdiEntry.aggregate([
        { $match: { 'assignedTo.userId': { $in: subIdList }, status: { $ne: 'completed' } } },
        { $group: { _id: '$assignedTo.userId', count: { $sum: 1 } } },
      ]),
      PdiEntry.countDocuments({ 'assignedTo.userId': actor.userId, status: 'completed' }),
    ])

    const activeCountByUser = new Map(activeCountRows.map(r => [r._id.toString(), r.count as number]))
    team = teamUsers.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      role: u.role,
      dealerName: u.dealerName,
      profilePic: u.profilePic,
      activeCount: activeCountByUser.get(u._id.toString()) ?? 0,
    }))

    const myActive = activeTasks.filter(t => t.assignedTo.userId.toString() === actor.userId).length
    summary = { myActive, teamActive: counts.active - myActive, myCompleted }
  }

  res.json({ counts, activeTasks, recentCompleted, team, summary })
}
