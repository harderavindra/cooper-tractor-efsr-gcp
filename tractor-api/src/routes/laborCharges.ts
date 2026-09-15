import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as laborCharges from '../controllers/laborCharges'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
router.use(requireAuth)

router.get('/',             laborCharges.list)
router.post('/import',      requireRole('admin'), upload.single('file'), laborCharges.importFile)
router.post('/bulk-delete', requireRole('admin'), laborCharges.removeMany)
router.post('/',            requireRole('admin'), laborCharges.create)
router.put('/:id',          requireRole('admin'), laborCharges.update)
router.delete('/:id',       requireRole('admin'), laborCharges.remove)

export default router
