import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as parts from '../controllers/parts'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
router.use(requireAuth)

router.get('/',            parts.list)
router.post('/import',     requireRole('admin'), upload.single('file'), parts.importFile)
router.post('/bulk-delete', requireRole('admin'), parts.removeMany)
router.post('/',           requireRole('admin'), parts.create)
router.put('/:id',         requireRole('admin'), parts.update)
router.delete('/:id',      requireRole('admin'), parts.remove)

export default router
