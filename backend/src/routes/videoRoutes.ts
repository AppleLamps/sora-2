import { Router } from 'express';
import * as videoController from '../controllers/videoController';
import { authenticate } from '../middleware/auth';
import { videoLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.post('/create', videoLimiter, videoController.createVideo);
router.get('/status/:id', videoController.getVideoStatus);
router.get('/', videoController.listVideos);
router.get('/:id/download', videoController.downloadVideo);
router.delete('/:id', videoController.deleteVideo);
router.post('/remix/:id', videoLimiter, videoController.remixVideo);

export default router;
