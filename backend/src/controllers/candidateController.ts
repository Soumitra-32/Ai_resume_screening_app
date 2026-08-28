import { Request, Response } from 'express';
import { Job } from '../models/Job';
import { Application } from '../models/Application';
import { Resume } from '../models/Resume';
import { User } from '../models/User';

export async function getRankedCandidates(req: Request, res: Response) {
  const { jobId } = req.params;
  const {
    minScore = '0',
    minExperience = '0',
    skills,
    status,
    search,
    sortField = 'matchScore',
    sortOrder = 'desc',
  } = req.query as Record<string, string>;

  const skillList = skills ? skills.split(',').filter(Boolean) : [];

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const appQuery: Record<string, any> = {
    jobId,
    matchScore: { $gte: parseFloat(minScore) },
  };
  if (status) appQuery.status = status;

  const applications = await Application.find(appQuery).populate({
    path: 'resumeId',
    populate: { path: 'candidateId' },
  });

  const minExp = parseInt(minExperience, 10) || 0;

  let mapped = applications
    .filter((app: any) => {
      const resume = app.resumeId;
      if (!resume) return false;
      if ((resume.extractedExperience ?? 0) < minExp) return false;
      if (skillList.length && !skillList.some((s) => resume.extractedSkills?.includes(s))) return false;
      if (search) {
        const candidate = resume.candidateId;
        const term = search.toLowerCase();
        const matchesName = candidate?.name?.toLowerCase().includes(term);
        const matchesEmail = candidate?.email?.toLowerCase().includes(term);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    })
    .map((app: any) => {
      const resume = app.resumeId;
      const candidate = resume.candidateId;
      return {
        id: candidate._id,
        applicationId: app._id,
        name: candidate.name,
        email: candidate.email,
        matchScore: app.matchScore ?? 0,
        experienceYears: resume.extractedExperience ?? 0,
        skills: (resume.extractedSkills || []).map((s: string) => ({
          name: s,
          matched: job.requiredSkills?.includes(s) ?? false,
        })),
        resumeUrl: resume.fileUrl,
        resumeText: resume.parsedText ?? '',
        status: app.status,
        appliedAt: app.appliedAt,
      };
    });

  mapped = mapped.sort((a: any, b: any) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (a[sortField] < b[sortField]) return -1 * dir;
    if (a[sortField] > b[sortField]) return 1 * dir;
    return 0;
  });

  res.json(mapped);
}

export async function getJobSkillsList(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job.requiredSkills || []);
}

export async function updateApplicationStatus(req: Request, res: Response) {
  const { applicationId } = req.params;
  const { status } = req.body;

  const valid = ['pending', 'shortlisted', 'rejected', 'hired'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = await Application.findByIdAndUpdate(
    applicationId,
    { status },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: 'Application not found' });

  // Trigger notification (e.g. email/queue) here
  res.json(updated);
}

export async function applyToJob(req: Request, res: Response) {
  const { id: jobId } = req.params;
  const userId = (req as any).user.id;

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const resume = await Resume.findOne({ candidateId: userId }).sort({ uploadedAt: -1 });
  if (!resume) return res.status(400).json({ error: 'Upload a resume before applying' });

  const existing = await Application.findOne({ jobId, resumeId: resume._id });
  if (existing) return res.status(409).json({ error: 'Already applied to this job' });

  const application = await Application.create({ jobId, resumeId: resume._id });
  res.status(201).json(application);
}

export async function listApplications(req: Request, res: Response) {
  const { id: jobId } = req.params;

  const applications = await Application.find({ jobId }).populate({
    path: 'resumeId',
    populate: { path: 'candidateId' },
  });

  res.json(applications);
}