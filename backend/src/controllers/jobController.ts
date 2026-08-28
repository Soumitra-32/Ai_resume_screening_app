import { Request, Response } from "express";
import { Job } from "../models/Job";
import { asyncHandler } from "../utils/asyncHandler";

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, requiredSkills, experienceRequired } = req.body;

  const job = await Job.create({
    recruiterId: req.user!.id,
    title,
    description,
    requiredSkills: requiredSkills ?? [],
    experienceRequired,
  });

  res.status(201).json(job);
});

export const listJobs = asyncHandler(async (_req: Request, res: Response) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json(jobs);
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }

  Object.assign(job, req.body);
  await job.save();
  res.json(job);
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }

  await job.deleteOne();
  res.json({ message: "Job deleted" });
});