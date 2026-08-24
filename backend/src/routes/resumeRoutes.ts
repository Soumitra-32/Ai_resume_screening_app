import { Router } from "express";
import { uploadResume, myResumes, getResume } from "../controllers/resumeController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware";

const router = Router();

router.post("/upload", authenticate, authorize("candidate"), upload.single("resume"), uploadResume);
router.get("/mine", authenticate, authorize("candidate"), myResumes);
router.get("/:id", authenticate, getResume);

export default router;