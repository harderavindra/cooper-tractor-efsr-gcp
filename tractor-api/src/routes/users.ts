import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireRole } from '../middleware/requireAuth'
import * as users from '../controllers/users'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Images only'))
  },
})
router.use(requireAuth)

router.get('/available-pincodes', requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician'), users.availablePincodes)
router.get('/',                   users.list)
router.post('/',                  requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.create)
router.put('/:id',                requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.update)
router.put('/:id/password',       requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.updatePassword)
router.patch('/:id/status',       requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.updateStatus)
router.patch('/:id/unlock',       requireRole('admin'), users.unlock)
router.delete('/:id',             requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.remove)
router.patch('/:id/profile-pic',  requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.confirmProfilePic)
router.post('/:id/profile-pic',   requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), upload.single('photo'), users.uploadProfilePic)
router.delete('/:id/profile-pic', requireRole('admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'), users.deleteProfilePic)

export default router
