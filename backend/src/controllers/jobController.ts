import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { IJob } from "../models/Job";
import { asyncHandler } from "../utils/asyncHandler";

const jobSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  requiredSkills: z.array(z.string().trim().min(1)).default([]).transform((skills) => skills.map((s) => s.toLowerCase())),
  experienceRequired: z.number().min(0).max(100).optional(),
  status: z.enum(["draft", "open", "closed", "archived"]).optional(),
});

const jobColumns = `id, recruiter_id AS "recruiterId", title, description,
  required_skills AS "requiredSkills", experience_required::float8 AS "experienceRequired",
  status, created_at AS "createdAt"`;
const jobColumnsWithAlias = `j.id, j.recruiter_id AS "recruiterId", j.title, j.description,
  j.required_skills AS "requiredSkills", j.experience_required::float8 AS "experienceRequired",
  j.status, j.created_at AS "createdAt"`;

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const data = jobSchema.parse(req.body);
  const result = await pool.query<IJob>(
    `INSERT INTO jobs (recruiter_id, title, description, required_skills, experience_required, status)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::text, 'open'))
     RETURNING ${jobColumns}`,
    [req.user!.id, data.title, data.description, data.requiredSkills, data.experienceRequired ?? null, data.status ?? null]
  );
  res.status(201).json(result.rows[0]);
});

export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const recruiterView = req.user!.role === "recruiter";
  const result = await pool.query<IJob & { applicantCount: number }>(
    `SELECT ${jobColumnsWithAlias}, COUNT(a.id)::int AS "applicantCount"
     FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
     WHERE ${recruiterView ? "j.recruiter_id = $1" : "j.status = 'open'"}
     GROUP BY j.id ORDER BY j.created_at DESC`,
    recruiterView ? [req.user!.id] : []
  );
  res.json(result.rows);
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query<IJob>(`SELECT ${jobColumns} FROM jobs WHERE id = $1`, [req.params.id]);
  const job = result.rows[0];
  if (!job) return res.status(404).json({ error: "Job not found" });

  if (req.user!.role === "recruiter" && job.recruiterId !== req.user!.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }
  if (req.user!.role === "candidate" && job.status !== "open") {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const data = jobSchema.partial().parse(req.body);
  const fieldMap: Record<string, string> = {
    title: "title",
    description: "description",
    requiredSkills: "required_skills",
    experienceRequired: "experience_required",
    status: "status",
  };
  const entries = Object.entries(data).filter(([key]) => fieldMap[key]);
  if (entries.length === 0) {
    const existing = await pool.query<IJob>(`SELECT ${jobColumns} FROM jobs WHERE id = $1`, [req.params.id]);
    const job = existing.rows[0];
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.recruiterId !== req.user!.id) return res.status(403).json({ error: "Not your job posting" });
    return res.json(job);
  }

  const values: unknown[] = [req.params.id, req.user!.id];
  const setClause = entries.map(([key, value], index) => {
    values.push(value);
    return `${fieldMap[key]} = $${index + 3}`;
  }).join(", ");
  const result = await pool.query<IJob>(
    `UPDATE jobs SET ${setClause} WHERE id = $1 AND recruiter_id = $2 RETURNING ${jobColumns}`,
    values
  );
  if (!result.rows[0]) {
    const exists = await pool.query("SELECT 1 FROM jobs WHERE id = $1", [req.params.id]);
    return res.status(exists.rowCount ? 403 : 404).json({ error: exists.rowCount ? "Not your job posting" : "Job not found" });
  }
  res.json(result.rows[0]);
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    "DELETE FROM jobs WHERE id = $1 AND recruiter_id = $2 RETURNING id",
    [req.params.id, req.user!.id]
  );
  if (!result.rowCount) {
    const exists = await pool.query("SELECT 1 FROM jobs WHERE id = $1", [req.params.id]);
    return res.status(exists.rowCount ? 403 : 404).json({ error: exists.rowCount ? "Not your job posting" : "Job not found" });
  }
  res.json({ message: "Job deleted" });
});
