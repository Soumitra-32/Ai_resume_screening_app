import { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { Resume } from "../models/Resume";
import { Application } from "../models/Application";
import { asyncHandler } from "../utils/asyncHandler";
import { parseResume } from "../services/mlServiceClient";
import { enqueueResumeScoring } from "../queues/resumeQueue";

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { jobId } = req.body;
  const uploadedPath = req.file.path;

  // Wrap everything after the physical upload so we can clean up the file
  // on disk if any downstream step fails (3.7).
  try {
    let parsed;
    try {
      parsed = await parseResume(uploadedPath, req.file.originalname);
    } catch (err) {
      console.error("[uploadResume] parseResume failed:", err);
      return res.status(502).json({ error: "Could not process this resume. Please try again." });
    }

  const resume = await Resume.create({
  candidateId: req.user!.id,
  fileUrl: uploadedPath,
  parsedText: parsed.data.raw_text,
  extractedName: parsed.data.name ?? undefined,
  extractedEmail: parsed.data.email ?? undefined,
  extractedPhone: parsed.data.phone ?? undefined,
  extractedExperience: parsed.data.experience_years ?? undefined,
  extractedSkills: [], // still populated later — see 5.4 fix below for why this stays resume-level
});
    if (jobId) {
      let application;
      try {
        application = await Application.create({
          jobId,
          resumeId: resume._id,
          candidateId: req.user!.id,
          status: "pending",
        });
      } catch (err: any) {
        if (err.code === 11000) {
          // Resume record stays valid even if the application already exists
          return res.status(409).json({ error: "You already applied to this job", resume });
        }
        throw err;
      }

      try {
        await enqueueResumeScoring({
          applicationId: application._id.toString(),
          resumeId: resume._id.toString(),
          jobId,
        });
      } catch (err) {
        // 3.6: queue failed after the application was created. Mark it as
        // failed so it doesn't sit silently in "pending" forever, and log
        // loudly so it can be picked up by a retry/reconciliation job.
        console.error("[uploadResume] Failed to enqueue scoring job:", err);
        application.status = "failed";
        await application.save();
      }
    }

    return res.status(201).json(resume);
  } catch (err) {
    // Any unexpected failure after the physical upload: remove the orphaned file
    await fs.unlink(uploadedPath).catch(() => {});
    throw err;
  }
});

export const myResumes = asyncHandler(async (req: Request, res: Response) => {
  const resumes = await Resume.find({ candidateId: req.user!.id }).sort({ uploadedAt: -1 });
  res.json(resumes);
});

export const getResume = asyncHandler(async (req: Request, res: Response) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ error: "Resume not found" });

  const isOwner = resume.candidateId.toString() === req.user!.id;

  let isAuthorizedRecruiter = false;
  if (req.user!.role === "recruiter") {
    const application = await Application.findOne({ resumeId: resume._id }).populate("jobId");
    const job = application?.jobId as any;
    isAuthorizedRecruiter = !!job && job.recruiterId.toString() === req.user!.id;
  }

  if (!isOwner && !isAuthorizedRecruiter) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(resume);
});

export const downloadResume = asyncHandler(async (req: Request, res: Response) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ error: "Resume not found" });

  const isOwner = resume.candidateId.toString() === req.user!.id;

  let isAuthorizedRecruiter = false;
  if (req.user!.role === "recruiter") {
    const application = await Application.findOne({ resumeId: resume._id }).populate("jobId");
    const job = application?.jobId as any;
    isAuthorizedRecruiter = !!job && job.recruiterId.toString() === req.user!.id;
  }

  if (!isOwner && !isAuthorizedRecruiter) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const absolutePath = path.resolve(resume.fileUrl);
  res.download(absolutePath);
});

export const deleteResume = asyncHandler(async (req: Request, res: Response) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ error: "Resume not found" });
  if (resume.candidateId.toString() !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const inUse = await Application.exists({ resumeId: resume._id });
  if (inUse) {
    return res.status(400).json({ error: "Cannot delete a resume that has active applications" });
  }

  await fs.unlink(resume.fileUrl).catch(() => {});
  await resume.deleteOne();

  res.json({ message: "Resume deleted" });
});