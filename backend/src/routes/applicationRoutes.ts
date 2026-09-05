import { Router } from 'express';
import { myApplications } from '../controllers/candidateController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.get('/mine', authenticate, authorize('candidate'), myApplications);

export default router;