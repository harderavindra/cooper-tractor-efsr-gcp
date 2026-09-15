import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as sapTractorAssets from '../controllers/sapTractorAssets'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
router.use(requireAuth)

const CAN_VIEW = ['admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'] as const

router.get('/search',  sapTractorAssets.search)
router.get('/:id',     requireRole(...CAN_VIEW), sapTractorAssets.getById)
router.get('/',        requireRole(...CAN_VIEW), sapTractorAssets.list)
router.post('/import', requireRole('admin'), upload.single('file'), sapTractorAssets.importFile)
router.delete('/all',  requireRole('admin'), sapTractorAssets.removeAll)
router.delete('/:id',  requireRole('admin'), sapTractorAssets.remove)

export default router
