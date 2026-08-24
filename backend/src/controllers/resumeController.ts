import { Request, Response } from "express";
import { Resume } from "../models/Resume";
import { asyncHandler } from "../utils/asyncHandler";

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const resume = await Resume.create({
    candidateId: req.user!.id,
    fileUrl: req.file.path,
    extractedSkills: [], // populated later by ML service (Phase 3+)
  });

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