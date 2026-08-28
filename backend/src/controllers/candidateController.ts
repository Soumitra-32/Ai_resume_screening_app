import { Request, Response } from "express";
import { Resume } from "../models/Resume";
import { Job } from "../models/Job";
import { Application } from "../models/Application";
import { asyncHandler } from "../utils/asyncHandler";
import { enqueueResumeScoring } from "../queues/resumeQueue";

export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const { resumeId } = req.body;
  const jobId = req.params.id;

  const resume = await Resume.findById(resumeId);
  if (!resume || resume.candidateId.toString() !== req.user!.id) {
    return res.status(400).json({ error: "Invalid resume" });
  }

  const application = await Application.create({ jobId, resumeId, status: "pending" });

  await enqueueResumeScoring({
    applicationId: application._id.toString(),
    resumeId: resume._id.toString(),
    jobId,
  });

  res.status(201).json(application);
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }

  const applications = await Application.find({ jobId: req.params.id })
    .populate("resumeId")
    .sort({ matchScore: -1 });
  res.json(applications);
});