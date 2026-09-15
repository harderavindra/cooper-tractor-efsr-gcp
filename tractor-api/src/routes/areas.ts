import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as areas from '../controllers/areas'

const router = Router()
router.use(requireAuth)

router.get('/',       areas.list)
router.post('/',      requireRole('admin'), areas.create)
router.put('/:id',    requireRole('admin'), areas.update)
router.delete('/:id', requireRole('admin'), areas.remove)

export default router
