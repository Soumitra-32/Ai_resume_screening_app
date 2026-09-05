import { Request, Response } from 'express';
import { Job } from '../models/Job';
import { Application } from '../models/Application';
import { Resume } from '../models/Resume';
import { enqueueResumeScoring } from '../queues/resumeQueue';
import { asyncHandler } from '../utils/asyncHandler';

const ALLOWED_SORT_FIELDS: Record<string, string> = {
  matchScore: 'matchScore',
  experienceYears: 'resumeInfo.extractedExperience',
  appliedAt: 'appliedAt',
  name: 'candidateInfo.name',
};

const ALLOWED_STATUSES = ['pending', 'scored', 'shortlisted', 'rejected', 'hired', 'failed'];

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
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  // 4.1 — validate minScore
  const parsedMinScore = Number(minScore);
  if (Number.isNaN(parsedMinScore) || parsedMinScore < 0 || parsedMinScore > 1) {
    return res.status(400).json({ error: 'minScore must be a number between 0 and 1' });
  }

  // 4.2 — validate minExperience
  const parsedMinExperience = Number(minExperience);
  if (Number.isNaN(parsedMinExperience) || parsedMinExperience < 0) {
    return res.status(400).json({ error: 'minExperience must be a non-negative number' });
  }

  // 4.3 — validate status
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }

  // 4.4 — validate sortField against an allow-list
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_SORT_FIELDS, sortField)) {
    return res.status(400).json({
      error: `sortField must be one of: ${Object.keys(ALLOWED_SORT_FIELDS).join(', ')}`,
    });
  }
  const sortOrderNormalized = sortOrder === 'asc' ? 1 : -1;
  const sortKey = ALLOWED_SORT_FIELDS[sortField];

  // 4.6 — pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const skillList = skills ? skills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

  const job = await Job.findOne({ _id: jobId, recruiterId: req.user!.id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // 4.7 — move filtering/sorting/pagination into MongoDB via aggregation
  const pipeline: any[] = [
    { $match: { jobId: job._id } },
    {
      $lookup: {
        from: 'resumes',
        localField: 'resumeId',
        foreignField: '_id',
        as: 'resumeInfo',
      },
    },
    { $unwind: '$resumeInfo' },
    {
      $lookup: {
        from: 'users',
        localField: 'resumeInfo.candidateId',
        foreignField: '_id',
        as: 'candidateInfo',
      },
    },
    { $unwind: '$candidateInfo' }, // 4.8 — inner join drops applications with a missing candidate
    {
      $match: {
        $or: [
          { matchScore: { $gte: parsedMinScore } },
          { matchScore: { $exists: false } },
          { matchScore: null },
        ],
        'resumeInfo.extractedExperience': { $gte: parsedMinExperience },
        ...(status ? { status } : {}),
        ...(skillList.length
          ? { 'resumeInfo.extractedSkills': { $in: skillList } } // requires extractedSkills to be stored normalized/lowercase — see 4.5
          : {}),
        ...(search
          ? {
              $or: [
                { 'candidateInfo.name': { $regex: search, $options: 'i' } },
                { 'candidateInfo.email': { $regex: search, $options: 'i' } },
              ],
            }
          : {}),
      },
    },
    { $sort: { [sortKey]: sortOrderNormalized } },
    {
      $facet: {
        data: [{ $skip: (pageNum - 1) * pageSize }, { $limit: pageSize }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await Application.aggregate(pipeline);
  const applications = result?.data ?? [];
  const total = result?.totalCount?.[0]?.count ?? 0;

  const requiredSkillSet = new Set((job.requiredSkills ?? []).map((s) => s.trim().toLowerCase()));

  const mapped = applications.map((app: any) => ({
    id: app.candidateInfo._id,
    applicationId: app._id,
    name: app.candidateInfo.name,
    email: app.candidateInfo.email,
    matchScore: app.matchScore ?? null,
    experienceYears: app.resumeInfo.extractedExperience ?? 0,
    skills: (app.resumeInfo.extractedSkills || []).map((s: string) => ({
      name: s,
      matched: requiredSkillSet.has(s.toLowerCase()),
    })),
    resumeUrl: `/api/resumes/${app.resumeInfo._id}/file`,
    resumeText: app.resumeInfo.parsedText ?? '',
    status: app.status,
    appliedAt: app.appliedAt,
  }));

  res.json({
    data: mapped,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function getJobSkillsList(req: Request, res: Response) {
  const { jobId } = req.params;
  const job = await Job.findOne({ _id: jobId, recruiterId: req.user!.id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // 4.5 — normalize to match the ML taxonomy's lowercase skill format
  const normalized = (job.requiredSkills || []).map((s) => s.trim().toLowerCase());
  res.json(normalized);
}

export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const { resumeId } = req.body;

  if (!resumeId) return res.status(400).json({ error: 'resumeId is required' });

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') return res.status(404).json({ error: 'Job not found' });

  const resume = await Resume.findOne({ _id: resumeId, candidateId: req.user!.id });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });

  try {
    const application = await Application.create({
      jobId,
      resumeId,
      candidateId: req.user!.id,
      status: 'pending',
    });

    await enqueueResumeScoring({
      applicationId: application._id.toString(),
      resumeId: resume._id.toString(),
      jobId,
    });

    res.status(201).json(application);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You already applied to this job' });
    }
    throw err;
  }
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const job = await Job.findOne({ _id: jobId, recruiterId: req.user!.id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const applications = await Application.find({ jobId }).populate('resumeId').populate('candidateId');
  res.json(applications);
});

export const myApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await Application.find({ candidateId: req.user!.id })
    .populate('jobId')
    .populate('resumeId')
    .sort({ appliedAt: -1 });
  res.json(applications);
});

export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { applicationId } = req.params;
  const { status } = req.body;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }

  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const job = application.jobId as any;
  if (job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: 'Not your job posting' });
  }

  application.status = status;
  await application.save();
  res.json(application);
});