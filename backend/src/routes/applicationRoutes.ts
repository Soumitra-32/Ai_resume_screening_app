import { Router } from 'express';
import { myApplications, retryApplication } from '../controllers/candidateController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.get('/mine', authenticate, authorize('candidate'), myApplications);
router.post('/:applicationId/retry', authenticate, authorize('candidate'), retryApplication);

export default router;