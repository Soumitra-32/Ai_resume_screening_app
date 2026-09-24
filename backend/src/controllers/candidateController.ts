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

// User-supplied search text is interpolated into a MongoDB $regex, so escape
// metacharacters first — an unbalanced "(" would otherwise make the whole
// aggregation throw and (before it was wrapped in asyncHandler) hang the request.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getRankedCandidates = asyncHandler(async (req: Request, res: Response) => {
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

  // Every optional filter becomes its own element of a top-level $and. Putting
  // them all in one object literal meant the search $or silently overwrote the
  // min-score $or — so typing a search term stopped filtering by score.
  const andConditions: Record<string, unknown>[] = [
    {
      // Unscored applications are always kept: hiding them behind a score
      // filter would make brand-new applications invisible to the recruiter.
      $or: [
        { matchScore: { $gte: parsedMinScore } },
        { matchScore: { $exists: false } },
        { matchScore: null },
      ],
    },
  ];

  // Only filter on experience when the recruiter explicitly asks for more than
  // 0 years. `{ $gte: 0 }` does not match documents where the field is missing
  // (MongoDB compares a missing field as null, which sorts below every number),
  // so the old unconditional filter hid every resume whose experience the
  // parser could not detect — with the default minExperience of 0.
  if (parsedMinExperience > 0) {
    andConditions.push({
      'resumeInfo.extractedExperience': { $gte: parsedMinExperience },
    });
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    andConditions.push({
      $or: [
        { 'candidateInfo.name': { $regex: safeSearch, $options: 'i' } },
        { 'candidateInfo.email': { $regex: safeSearch, $options: 'i' } },
      ],
    });
  }

  const filterStage: Record<string, unknown> = { $and: andConditions };
  if (status) filterStage.status = status;
  if (skillList.length) {
    // requires extractedSkills to be stored normalized/lowercase — see 4.5
    filterStage['resumeInfo.extractedSkills'] = { $in: skillList };
  }

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
    { $match: filterStage },
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
    // Relative to the API client's baseURL (/api) — an extra /api prefix here
    // produced /api/api/resumes/<id>/file and a 404 on download.
    resumeUrl: `/resumes/${app.resumeInfo._id}/file`,
    resumeText: app.resumeInfo.parsedText ?? '',
    status: app.status,
    appliedAt: app.appliedAt,
  }));

  res.json({
    data: mapped,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

export const getJobSkillsList = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = await Job.findOne({ _id: jobId, recruiterId: req.user!.id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // 4.5 — normalize to match the ML taxonomy's lowercase skill format
  const normalized = (job.requiredSkills || []).map((s) => s.trim().toLowerCase());
  res.json(normalized);
});

// POST /jobs/:id/apply — candidate applies to a job with an existing resume
export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const { resumeId } = req.body as { resumeId?: string };

  if (!resumeId) return res.status(400).json({ error: 'resumeId is required' });

  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') {
    return res.status(404).json({ error: 'Job not found' });
  }

  const resume = await Resume.findOne({ _id: resumeId, candidateId: req.user!.id });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });

  let application;
  try {
    application = await Application.create({
      jobId: job._id,
      resumeId: resume._id,
      candidateId: req.user!.id,
      status: 'pending',
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You already applied to this job' });
    }
    throw err;
  }

  try {
    await enqueueResumeScoring({
      applicationId: application._id.toString(),
      resumeId: resume._id.toString(),
      jobId: job._id.toString(),
    });
  } catch (err) {
    console.error('[applyToJob] Failed to enqueue scoring job:', err);
    application.status = 'failed';
    await application.save();
  }

  res.status(201).json(application);
});

// GET /jobs/:id/applications — recruiter views all applications for their job
export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const { id: jobId } = req.params;

  const job = await Job.findOne({ _id: jobId, recruiterId: req.user!.id });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const applications = await Application.find({ jobId: job._id })
    .populate('resumeId')
    .populate('candidateId')
    .sort({ appliedAt: -1 });

  res.json(applications);
});

// GET /applications/mine — candidate views their own applications
export const myApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await Application.find({ candidateId: req.user!.id })
    .populate('jobId')
    .populate('resumeId')
    .sort({ appliedAt: -1 });

  res.json(applications);
});

// PATCH /applications/:applicationId/status — recruiter updates an application's status
export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { applicationId } = req.params;
  const { status } = req.body as { status?: string };

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }

  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const job = application.jobId as any;
  if (!job || job.recruiterId.toString() !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  application.status = status;
  await application.save();

  res.json(application);
});

// POST /applications/:applicationId/retry — re-queue scoring for an
// application whose enqueue attempt failed (Redis/queue outage). Without this
// a "failed" application was permanently unscoreable: the queue's own retries
// only cover jobs that made it into Redis in the first place.
export const retryApplication = asyncHandler(async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  const application = await Application.findById(applicationId);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  if (application.candidateId.toString() !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (application.status !== 'failed') {
    return res.status(400).json({ error: 'Only applications with status "failed" can be retried' });
  }

  try {
    await enqueueResumeScoring({
      applicationId: application._id.toString(),
      resumeId: application.resumeId.toString(),
      jobId: application.jobId.toString(),
    });
  } catch (err) {
    console.error('[retryApplication] Failed to re-enqueue scoring job:', err);
    return res.status(503).json({ error: 'Scoring queue is unavailable. Please try again shortly.' });
  }

  application.status = 'pending';
  await application.save();

  res.json(application);
});