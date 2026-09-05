import { Request, Response } from "express";
import { z } from "zod";
import { Job } from "../models/Job";
import { Application } from "../models/Application";
import { asyncHandler } from "../utils/asyncHandler";

const jobSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  requiredSkills: z
    .array(z.string().trim().min(1))
    .default([])
    .transform((skills) => skills.map((s) => s.toLowerCase())), // normalize on write
  experienceRequired: z.number().min(0).max(100).optional(),
  status: z.enum(["draft", "open", "closed", "archived"]).optional(),
});

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const data = jobSchema.parse(req.body);

  const job = await Job.create({
    recruiterId: req.user!.id,
    ...data,
  });

  res.status(201).json(job);
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const filter =
    req.user!.role === "recruiter"
      ? { recruiterId: req.user!.id }
      : { status: "open" };

  const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();

  const counts = await Application.aggregate([
    { $match: { jobId: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: "$jobId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const jobsWithCounts = jobs.map((job) => ({
    ...job,
    applicantCount: countMap.get(job._id.toString()) ?? 0,
  }));

  res.json(jobsWithCounts);
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const isOwnerRecruiter =
    req.user!.role === "recruiter" && job.recruiterId.toString() === req.user!.id;

  if (req.user!.role === "recruiter" && !isOwnerRecruiter) {
    // Recruiters can only view their own postings, regardless of status
    return res.status(403).json({ error: "Not your job posting" });
  }

  if (req.user!.role === "candidate" && job.status !== "open") {
    // Candidates can only see jobs that are actually open
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }

  const data = jobSchema.partial().parse(req.body);
  Object.assign(job, data);
  await job.save();
  res.json(job);
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }

  await Application.deleteMany({ jobId: job._id });
  await job.deleteOne();

  res.json({ message: "Job deleted" });
});