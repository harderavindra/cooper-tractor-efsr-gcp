import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as pdi from '../controllers/pdiEntries'

const router = Router()
router.use(requireAuth)

router.get('/',                pdi.list)
router.get('/:id',             pdi.getById)
router.post('/',               pdi.create)
router.put('/:id',             pdi.update)
router.put('/:id/acknowledge', pdi.acknowledge)
router.put('/:id/start',       pdi.start)
router.put('/:id/save-progress', pdi.saveProgress)
router.put('/:id/complete',    pdi.complete)
router.put('/:id/reassign',    requireRole('admin', 'rsm', 'area_manager', 'dealer'), pdi.reassign)
router.delete('/:id',          requireRole('admin', 'rsm'), pdi.remove)

export default router
