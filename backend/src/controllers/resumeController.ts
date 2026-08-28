import { Request, Response } from "express";
import { Resume } from "../models/Resume";
import { Application } from "../models/Application";
import { asyncHandler } from "../utils/asyncHandler";
import { parseResume } from "../services/mlServiceClient";
import { enqueueResumeScoring } from "../queues/resumeQueue";

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { jobId } = req.body;

  const resume = await Resume.create({
    candidateId: req.user!.id,
    fileUrl: req.file.path,
    extractedSkills: [],
  });

  try {
    const parsed = await parseResume(req.file.path, req.file.originalname);
    resume.parsedText = parsed.data.raw_text;
    // The ML parse endpoint doesn't extract skills/experience — that happens at scoring time.
    // Leave extractedSkills/extractedExperience as-is here; they get filled in by the worker
    // after /score-resume runs (see resumeWorker.ts fix below).
    await resume.save();
  } catch (err) {
    console.error("[uploadResume] parseResume failed:", err);
  }

  if (jobId) {
    const application = await Application.create({
      jobId,
      resumeId: resume._id,
      status: "pending",
    });

    await enqueueResumeScoring({
      applicationId: application._id.toString(),
      resumeId: resume._id.toString(),
      jobId,
    });
  }

  res.status(201).json(resume);
});

export const myResumes = asyncHandler(async (req: Request, res: Response) => {
  const resumes = await Resume.find({ candidateId: req.user!.id }).sort({ uploadedAt: -1 });
  res.json(resumes);
});

export const getResume = asyncHandler(async (req: Request, res: Response) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ error: "Resume not found" });

  const isOwner = resume.candidateId.toString() === req.user!.id;
  const isRecruiter = req.user!.role === "recruiter";
  if (!isOwner && !isRecruiter) return res.status(403).json({ error: "Forbidden" });

  res.json(resume);
});