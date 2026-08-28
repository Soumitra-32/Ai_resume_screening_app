import { Router } from 'express';
import {
  getRankedCandidates,
  getJobSkillsList,
  updateApplicationStatus,
} from '../controllers/candidateController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

router.get('/jobs/:jobId/candidates', authenticate, authorize('recruiter'), getRankedCandidates);
router.get('/jobs/:jobId/skills', authenticate, authorize('recruiter'), getJobSkillsList);
router.patch('/applications/:applicationId/status', authenticate, authorize('recruiter'), updateApplicationStatus);

export default router;