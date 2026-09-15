import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import * as me from '../controllers/me'

const router = Router()
router.use(requireAuth)

router.get('/dashboard', me.getDashboard)

export default router
