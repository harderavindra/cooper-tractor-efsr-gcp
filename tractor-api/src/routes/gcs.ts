import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import * as gcs from '../controllers/gcs'

const router = Router()
router.use(requireAuth)

router.post('/sign',       gcs.sign)
router.post('/upload-url', gcs.getUploadUrl)
router.get('/proxy',       gcs.proxy)

export default router
