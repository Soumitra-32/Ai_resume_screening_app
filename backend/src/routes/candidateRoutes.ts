import { Router } from 'express';
import {
  getRankedCandidates,
  getJobSkillsList,
  updateApplicationStatus,
} from '../controllers/candidateController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/jobs/:jobId/candidates', authMiddleware, getRankedCandidates);
router.get('/jobs/:jobId/skills', authMiddleware, getJobSkillsList);
router.patch('/applications/:applicationId/status', authMiddleware, updateApplicationStatus);

export default router;