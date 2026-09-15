import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as tractorAssets from '../controllers/tractorAssets'

const router = Router()
router.use(requireAuth)

router.get('/search',  tractorAssets.search)
router.get('/',        tractorAssets.list)
router.get('/:id',     tractorAssets.getById)
const CAN_MANAGE = ['admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'] as const

router.post('/',       requireRole(...CAN_MANAGE), tractorAssets.create)
router.put('/:id',     requireRole(...CAN_MANAGE), tractorAssets.update)
router.delete('/:id',  requireRole('admin', 'rsm'), tractorAssets.remove)

export default router
