import { Request, Response } from "express";
import { pool } from "../config/db";
import { enqueueResumeScoring } from "../queues/resumeQueue";
import { asyncHandler } from "../utils/asyncHandler";

const ALLOWED_SORT_FIELDS: Record<string, string> = {
  matchScore: "a.match_score",
  experienceYears: "r.extracted_experience",
  appliedAt: "a.applied_at",
  name: "u.name",
};
const ALLOWED_STATUSES = ["pending", "scored", "shortlisted", "rejected", "hired", "failed"];

const applicationColumns = `id, job_id AS "jobId", candidate_id AS "candidateId", resume_id AS "resumeId",
  match_score::float8 AS "matchScore", status, applied_at AS "appliedAt"`;
const resumeColumns = `id, candidate_id AS "candidateId", file_url AS "fileUrl", parsed_text AS "parsedText",
  extracted_name AS "extractedName", extracted_email AS "extractedEmail", extracted_phone AS "extractedPhone",
  extracted_skills AS "extractedSkills", extracted_experience AS "extractedExperience", uploaded_at AS "uploadedAt"`;

export const getRankedCandidates = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const {
    minScore = "0", minExperience = "0", skills, status, search,
    sortField = "matchScore", sortOrder = "desc", page = "1", limit = "20",
  } = req.query as Record<string, string>;

  const parsedMinScore = Number(minScore);
  if (Number.isNaN(parsedMinScore) || parsedMinScore < 0 || parsedMinScore > 1) {
    return res.status(400).json({ error: "minScore must be a number between 0 and 1" });
  }
  const parsedMinExperience = Number(minExperience);
  if (Number.isNaN(parsedMinExperience) || parsedMinExperience < 0) {
    return res.status(400).json({ error: "minExperience must be a non-negative number" });
  }
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_SORT_FIELDS, sortField)) {
    return res.status(400).json({ error: `sortField must be one of: ${Object.keys(ALLOWED_SORT_FIELDS).join(", ")}` });
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const jobResult = await pool.query<{ requiredSkills: string[] }>(
    `SELECT required_skills AS "requiredSkills" FROM jobs WHERE id = $1 AND recruiter_id = $2`,
    [jobId, req.user!.id]
  );
  const job = jobResult.rows[0];
  if (!job) return res.status(404).json({ error: "Job not found" });

  const conditions = ["a.job_id = $1", "(a.match_score >= $2 OR a.match_score IS NULL)"];
  const values: unknown[] = [jobId, parsedMinScore];
  const add = (condition: (placeholder: string) => string, value: unknown) => {
    values.push(value);
    conditions.push(condition(`$${values.length}`));
  };
  if (parsedMinExperience > 0) add((p) => `r.extracted_experience >= ${p}`, parsedMinExperience);
  if (status) add((p) => `a.status = ${p}`, status);
  const skillList = skills ? skills.split(",").map((skill) => skill.trim().toLowerCase()).filter(Boolean) : [];
  if (skillList.length) add((p) => `r.extracted_skills && ${p}::text[]`, skillList);
  if (search) {
    values.push(search);
    const p = `$${values.length}`;
    conditions.push(`(POSITION(LOWER(${p}) IN LOWER(u.name)) > 0 OR POSITION(LOWER(${p}) IN LOWER(u.email)) > 0)`);
  }
  const where = conditions.join(" AND ");
  const sortOrderSql = req.query.sortOrder === "asc" ? "ASC" : "DESC";
  const sortExpression = ALLOWED_SORT_FIELDS[sortField];
  const countPromise = pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM applications a
     JOIN resumes r ON r.id = a.resume_id JOIN users u ON u.id = r.candidate_id WHERE ${where}`,
    values
  );
  const dataValues = [...values, pageSize, (pageNum - 1) * pageSize];
  const dataPromise = pool.query(
    `SELECT a.id AS "applicationId", a.match_score::float8 AS "matchScore", a.status, a.applied_at AS "appliedAt",
       r.id AS "resumeId", r.parsed_text AS "resumeText", r.extracted_skills AS skills,
       r.extracted_experience AS "experienceYears", u.id AS "candidateId", u.name, u.email
     FROM applications a JOIN resumes r ON r.id = a.resume_id JOIN users u ON u.id = r.candidate_id
     WHERE ${where} ORDER BY ${sortExpression} ${sortOrderSql} NULLS LAST
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    dataValues
  );
  const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);
  const requiredSkillSet = new Set((job.requiredSkills ?? []).map((skill) => skill.trim().toLowerCase()));
  const mapped = dataResult.rows.map((row: any) => ({
    id: row.candidateId,
    applicationId: row.applicationId,
    name: row.name,
    email: row.email,
    matchScore: row.matchScore == null ? null : Number(row.matchScore),
    experienceYears: row.experienceYears == null ? 0 : Number(row.experienceYears),
    skills: (row.skills || []).map((name: string) => ({ name, matched: requiredSkillSet.has(name.toLowerCase()) })),
    resumeUrl: `/resumes/${row.resumeId}/file`,
    resumeText: row.resumeText ?? "",
    status: row.status,
    appliedAt: row.appliedAt,
  }));
  const total = countResult.rows[0]?.count ?? 0;
  res.json({ data: mapped, pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});

export const getJobSkillsList = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<{ requiredSkills: string[] }>(
    "SELECT required_skills AS \"requiredSkills\" FROM jobs WHERE id = $1 AND recruiter_id = $2",
    [req.params.jobId, req.user!.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Job not found" });
  res.json((result.rows[0].requiredSkills || []).map((skill) => skill.trim().toLowerCase()));
});

export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const { resumeId } = req.body as { resumeId?: string };
  if (!resumeId) return res.status(400).json({ error: "resumeId is required" });

  const jobResult = await pool.query<{ id: string }>("SELECT id FROM jobs WHERE id = $1 AND status = 'open'", [jobId]);
  const job = jobResult.rows[0];
  if (!job) return res.status(404).json({ error: "Job not found" });
  const resumeResult = await pool.query<{ id: string }>("SELECT id FROM resumes WHERE id = $1 AND candidate_id = $2", [resumeId, req.user!.id]);
  const resume = resumeResult.rows[0];
  if (!resume) return res.status(404).json({ error: "Resume not found" });

  let application;
  try {
    const result = await pool.query(
      `INSERT INTO applications (job_id, resume_id, candidate_id, status)
       VALUES ($1, $2, $3, 'pending') RETURNING ${applicationColumns}`,
      [job.id, resume.id, req.user!.id]
    );
    application = result.rows[0];
  } catch (error: any) {
    if (error.code === "23505") return res.status(409).json({ error: "You already applied to this job" });
    throw error;
  }

  try {
    await enqueueResumeScoring({ applicationId: application.id, resumeId: resume.id, jobId: job.id });
  } catch (error) {
    console.error("[applyToJob] Failed to enqueue scoring job:", error);
    await pool.query("UPDATE applications SET status = 'failed' WHERE id = $1", [application.id]);
    application.status = "failed";
  }
  res.status(201).json(application);
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const jobResult = await pool.query<{ id: string }>("SELECT id FROM jobs WHERE id = $1 AND recruiter_id = $2", [jobId, req.user!.id]);
  if (!jobResult.rows[0]) return res.status(404).json({ error: "Job not found" });
  const result = await pool.query(
    `SELECT a.id AS "applicationId", a.job_id AS "jobId", a.match_score::float8 AS "matchScore", a.status, a.applied_at AS "appliedAt",
       u.id AS "candidateId", u.name AS "candidateName", u.email AS "candidateEmail", u.role AS "candidateRole",
       r.id AS "resumeId", r.candidate_id AS "resumeCandidateId", r.file_url AS "fileUrl", r.parsed_text AS "parsedText",
       r.extracted_name AS "extractedName", r.extracted_email AS "extractedEmail", r.extracted_phone AS "extractedPhone",
       r.extracted_skills AS "extractedSkills", r.extracted_experience::float8 AS "extractedExperience", r.uploaded_at AS "uploadedAt"
     FROM applications a JOIN users u ON u.id = a.candidate_id JOIN resumes r ON r.id = a.resume_id
     WHERE a.job_id = $1 ORDER BY a.applied_at DESC`,
    [jobId]
  );
  res.json(result.rows.map((row: any) => ({
    id: row.applicationId, jobId: row.jobId,
    candidateId: { id: row.candidateId, name: row.candidateName, email: row.candidateEmail, role: row.candidateRole },
    resumeId: {
      id: row.resumeId, candidateId: row.resumeCandidateId, fileUrl: row.fileUrl, parsedText: row.parsedText,
      extractedName: row.extractedName, extractedEmail: row.extractedEmail, extractedPhone: row.extractedPhone,
      extractedSkills: row.extractedSkills, extractedExperience: row.extractedExperience, uploadedAt: row.uploadedAt,
    },
    matchScore: row.matchScore == null ? null : Number(row.matchScore), status: row.status, appliedAt: row.appliedAt,
  })));
});

export const myApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT a.id AS "applicationId", a.match_score AS "matchScore", a.status, a.applied_at AS "appliedAt",
       j.id AS "jobId", j.recruiter_id AS "recruiterId", j.title, j.description,
       j.required_skills AS "requiredSkills", j.experience_required::float8 AS "experienceRequired", j.status AS "jobStatus", j.created_at AS "jobCreatedAt",
       r.id AS "resumeId", r.candidate_id AS "resumeCandidateId", r.file_url AS "fileUrl", r.parsed_text AS "parsedText",
       r.extracted_name AS "extractedName", r.extracted_email AS "extractedEmail", r.extracted_phone AS "extractedPhone",
       r.extracted_skills AS "extractedSkills", r.extracted_experience::float8 AS "extractedExperience", r.uploaded_at AS "uploadedAt"
     FROM applications a JOIN jobs j ON j.id = a.job_id JOIN resumes r ON r.id = a.resume_id
     WHERE a.candidate_id = $1 ORDER BY a.applied_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows.map((row: any) => ({
    id: row.applicationId,
    jobId: { id: row.jobId, recruiterId: row.recruiterId, title: row.title, description: row.description,
      requiredSkills: row.requiredSkills, experienceRequired: row.experienceRequired, status: row.jobStatus, createdAt: row.jobCreatedAt },
    resumeId: { id: row.resumeId, candidateId: row.resumeCandidateId, fileUrl: row.fileUrl, parsedText: row.parsedText,
      extractedName: row.extractedName, extractedEmail: row.extractedEmail, extractedPhone: row.extractedPhone,
      extractedSkills: row.extractedSkills, extractedExperience: row.extractedExperience, uploadedAt: row.uploadedAt },
    matchScore: row.matchScore == null ? null : Number(row.matchScore), status: row.status, appliedAt: row.appliedAt,
  })));
});

export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { applicationId } = req.params;
  const { status } = req.body as { status?: string };
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
  }
  const result = await pool.query(
    `UPDATE applications AS a SET status = $3 FROM jobs j
     WHERE a.id = $1 AND a.job_id = j.id AND j.recruiter_id = $2
     RETURNING a.id AS id, a.job_id AS "jobId", a.candidate_id AS "candidateId", a.resume_id AS "resumeId",
       a.match_score::float8 AS "matchScore", a.status, a.applied_at AS "appliedAt"`,
    [applicationId, req.user!.id, status]
  );
  if (!result.rows[0]) {
    const exists = await pool.query("SELECT 1 FROM applications WHERE id = $1", [applicationId]);
    return res.status(exists.rowCount ? 403 : 404).json({ error: exists.rowCount ? "Forbidden" : "Application not found" });
  }
  res.json(result.rows[0]);
});

export const retryApplication = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<{ id: string; candidateId: string; resumeId: string; jobId: string; status: string }>(
    `SELECT id, candidate_id AS "candidateId", resume_id AS "resumeId", job_id AS "jobId", status
     FROM applications WHERE id = $1`,
    [req.params.applicationId]
  );
  const application = result.rows[0];
  if (!application) return res.status(404).json({ error: "Application not found" });
  if (application.candidateId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
  if (application.status !== "failed") {
    return res.status(400).json({ error: "Only applications with status \"failed\" can be retried" });
  }
  try {
    await enqueueResumeScoring({ applicationId: application.id, resumeId: application.resumeId, jobId: application.jobId });
  } catch (error) {
    console.error("[retryApplication] Failed to re-enqueue scoring job:", error);
    return res.status(503).json({ error: "Scoring queue is unavailable. Please try again shortly." });
  }
  const updated = await pool.query(
    `UPDATE applications SET status = 'pending' WHERE id = $1 RETURNING ${applicationColumns}`,
    [application.id]
  );
  res.json(updated.rows[0]);
});
