import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as regions from '../controllers/regions'

const router = Router()
router.use(requireAuth)

router.get('/',       regions.list)
router.post('/',      requireRole('admin'), regions.create)
router.put('/:id',    requireRole('admin'), regions.update)
router.delete('/:id', requireRole('admin'), regions.remove)

export default router
