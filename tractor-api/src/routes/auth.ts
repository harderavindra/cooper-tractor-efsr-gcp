import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import * as auth from '../controllers/auth'

const router = Router()

router.post('/login', auth.login)
router.post('/refresh', auth.refresh)
router.post('/logout', auth.logout)
router.get('/me', requireAuth, auth.me)

export default router
