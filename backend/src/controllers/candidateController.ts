import { Request, Response } from 'express';
import { prisma } from '../config/db';

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

  const applications = await prisma.application.findMany({
    where: {
      jobId,
      matchScore: { gte: parseFloat(minScore) },
      ...(status ? { status } : {}),
      resume: {
        extractedExperience: { gte: parseInt(minExperience, 10) || 0 },
        ...(skillList.length ? { extractedSkills: { hasSome: skillList } } : {}),
        candidate: search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : undefined,
      },
    },
    include: {
      resume: { include: { candidate: true } },
    },
  });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  const requiredSkills = job?.requiredSkills || [];

  const mapped = applications.map((app) => ({
    id: app.resume.candidate.id,
    applicationId: app.id,
    name: app.resume.candidate.name,
    email: app.resume.candidate.email,
    matchScore: app.matchScore ?? 0,
    experienceYears: app.resume.extractedExperience ?? 0,
    skills: (app.resume.extractedSkills || []).map((s) => ({
      name: s,
      matched: requiredSkills.includes(s),
    })),
    resumeUrl: app.resume.fileUrl,
    resumeText: app.resume.parsedText ?? '',
    status: app.status,
    appliedAt: app.appliedAt,
  }));

  const sorted = mapped.sort((a: any, b: any) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    if (a[sortField] < b[sortField]) return -1 * dir;
    if (a[sortField] > b[sortField]) return 1 * dir;
    return 0;
  });

  res.json(sorted);
}

export async function getJobSkillsList(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = await prisma.job.findUnique({ where: { id: jobId } });
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

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });

  // Trigger notification (e.g. email/queue) here
  res.json(updated);
}