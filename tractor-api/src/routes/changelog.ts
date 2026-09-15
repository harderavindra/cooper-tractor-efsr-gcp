import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { list } from '../controllers/changelog.js'

const router = Router()

router.get('/', requireAuth, list)

export default router
