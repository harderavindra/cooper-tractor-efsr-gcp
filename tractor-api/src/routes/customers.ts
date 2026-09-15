import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as customers from '../controllers/customers'

const router = Router()
router.use(requireAuth)

router.get('/search',  customers.search)
router.get('/',        customers.list)
router.get('/:id',     customers.getById)
router.post('/',       requireRole('admin'), customers.create)
router.put('/:id',     requireRole('admin'), customers.update)
router.delete('/:id',  requireRole('admin'), customers.remove)

export default router
