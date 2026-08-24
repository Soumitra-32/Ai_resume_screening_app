import { Router } from "express";
import { createJob, listJobs, getJob, updateJob, deleteJob } from "../controllers/jobController";
import { applyToJob, listApplications } from "../controllers/candidateController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", listJobs);
router.get("/:id", getJob);
router.post("/", authenticate, authorize("recruiter"), createJob);
router.put("/:id", authenticate, authorize("recruiter"), updateJob);
router.delete("/:id", authenticate, authorize("recruiter"), deleteJob);

router.post("/:id/apply", authenticate, authorize("candidate"), applyToJob);
router.get("/:id/applications", authenticate, authorize("recruiter"), listApplications);

export default router;