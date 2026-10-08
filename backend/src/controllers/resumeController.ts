import { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { pool } from "../config/db";
import { IResume } from "../models/Resume";
import { asyncHandler } from "../utils/asyncHandler";
import { parseResume } from "../services/mlServiceClient";
import { enqueueResumeScoring } from "../queues/resumeQueue";

const resumeColumns = `id, candidate_id AS "candidateId", file_url AS "fileUrl",
  parsed_text AS "parsedText", extracted_name AS "extractedName",
  extracted_email AS "extractedEmail", extracted_phone AS "extractedPhone",
  extracted_skills AS "extractedSkills", extracted_experience::float8 AS "extractedExperience",
  uploaded_at AS "uploadedAt"`;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const { jobId } = req.body;
  const uploadedPath = req.file.path;

  try {
    if (jobId) {
      if (!isUuid(jobId)) {
        await fs.unlink(uploadedPath).catch(() => {});
        return res.status(404).json({ error: "Job not found" });
      }
      const job = await pool.query("SELECT 1 FROM jobs WHERE id = $1 AND status = 'open'", [jobId]);
      if (!job.rowCount) {
        await fs.unlink(uploadedPath).catch(() => {});
        return res.status(404).json({ error: "Job not found" });
      }
    }

    let parsed;
    try {
      parsed = await parseResume(uploadedPath, req.file.originalname);
    } catch (err) {
      console.error("[uploadResume] parseResume failed:", err);
      await fs.unlink(uploadedPath).catch(() => {});
      return res.status(502).json({ error: "Could not process this resume. Please try again." });
    }

    const createdResume = await pool.query<IResume>(
      `INSERT INTO resumes
       (candidate_id, file_url, parsed_text, extracted_name, extracted_email, extracted_phone, extracted_experience)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${resumeColumns}`,
      [req.user!.id, uploadedPath, parsed.data.raw_text, parsed.data.name, parsed.data.email,
        parsed.data.phone, parsed.data.experience_years]
    );
    const resume = createdResume.rows[0];

    if (jobId) {
      let applicationId: string;
      try {
        const result = await pool.query<{ id: string }>(
          `INSERT INTO applications (job_id, resume_id, candidate_id, status)
           VALUES ($1, $2, $3, 'pending') RETURNING id`,
          [jobId, resume.id, req.user!.id]
        );
        applicationId = result.rows[0].id;
      } catch (err: any) {
        if (err.code === "23505") {
          return res.status(409).json({ error: "You already applied to this job", resume });
        }
        throw err;
      }

      try {
        await enqueueResumeScoring({ applicationId, resumeId: resume.id, jobId });
      } catch (err) {
        console.error("[uploadResume] Failed to enqueue scoring job:", err);
        await pool.query("UPDATE applications SET status = 'failed' WHERE id = $1", [applicationId]);
      }
    }

    return res.status(201).json(resume);
  } catch (err) {
    await fs.unlink(uploadedPath).catch(() => {});
    throw err;
  }
});

export const myResumes = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<IResume>(
    `SELECT ${resumeColumns} FROM resumes WHERE candidate_id = $1 ORDER BY uploaded_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows);
});

export const getResume = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<IResume>(`SELECT ${resumeColumns} FROM resumes WHERE id = $1`, [req.params.id]);
  const resume = result.rows[0];
  if (!resume) return res.status(404).json({ error: "Resume not found" });

  const isOwner = resume.candidateId === req.user!.id;
  let isAuthorizedRecruiter = false;
  if (req.user!.role === "recruiter") {
    const authorized = await pool.query(
      `SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.resume_id = $1 AND j.recruiter_id = $2 LIMIT 1`,
      [resume.id, req.user!.id]
    );
    isAuthorizedRecruiter = !!authorized.rowCount;
  }
  if (!isOwner && !isAuthorizedRecruiter) return res.status(403).json({ error: "Forbidden" });
  res.json(resume);
});

export const downloadResume = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<IResume>(`SELECT ${resumeColumns} FROM resumes WHERE id = $1`, [req.params.id]);
  const resume = result.rows[0];
  if (!resume) return res.status(404).json({ error: "Resume not found" });

  const isOwner = resume.candidateId === req.user!.id;
  let isAuthorizedRecruiter = false;
  if (req.user!.role === "recruiter") {
    const authorized = await pool.query(
      `SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.resume_id = $1 AND j.recruiter_id = $2 LIMIT 1`,
      [resume.id, req.user!.id]
    );
    isAuthorizedRecruiter = !!authorized.rowCount;
  }
  if (!isOwner && !isAuthorizedRecruiter) return res.status(403).json({ error: "Forbidden" });

  res.download(path.resolve(resume.fileUrl));
});

export const deleteResume = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<IResume>(`SELECT ${resumeColumns} FROM resumes WHERE id = $1`, [req.params.id]);
  const resume = result.rows[0];
  if (!resume) return res.status(404).json({ error: "Resume not found" });
  if (resume.candidateId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });

  const inUse = await pool.query("SELECT 1 FROM applications WHERE resume_id = $1 LIMIT 1", [resume.id]);
  if (inUse.rowCount) {
    return res.status(400).json({ error: "Cannot delete a resume that has active applications" });
  }

  await pool.query("DELETE FROM resumes WHERE id = $1", [resume.id]);
  await fs.unlink(resume.fileUrl).catch(() => {});
  res.json({ message: "Resume deleted" });
});
