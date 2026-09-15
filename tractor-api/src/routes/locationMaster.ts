import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as locationMaster from '../controllers/locationMaster'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
router.use(requireAuth)

router.get('/distinct',     locationMaster.distinct)
router.get('/',             locationMaster.list)
router.post('/import',      requireRole('admin'), upload.single('file'), locationMaster.importFile)
router.post('/assign-area', requireRole('admin'), locationMaster.assignArea)
router.post('/bulk',        requireRole('admin'), locationMaster.bulk)
router.post('/',            requireRole('admin'), locationMaster.create)
router.put('/:id',          requireRole('admin'), locationMaster.update)
router.delete('/:id',       requireRole('admin'), locationMaster.remove)

export default router
