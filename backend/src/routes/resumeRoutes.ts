import { Router } from "express";
import { uploadResume, myResumes, getResume, downloadResume, deleteResume } from "../controllers/resumeController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { upload, verifyFileContent } from "../middlewares/uploadMiddleware";

const router = Router();

router.post(
  "/upload",
  authenticate,
  authorize("candidate"),
  upload.single("resume"),
  verifyFileContent,
  uploadResume
);
router.get("/mine", authenticate, authorize("candidate"), myResumes);
router.get("/:id", authenticate, getResume);
router.get("/:id/file", authenticate, downloadResume);
router.delete("/:id", authenticate, authorize("candidate"), deleteResume);

export default router;