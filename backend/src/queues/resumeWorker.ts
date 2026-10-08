import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { ResumeScoreJobData } from "./resumeQueue";
import { scoreResume } from "../services/mlServiceClient";
import { env } from "../config/env";
import { pool } from "../config/db";
import { IResume } from "../models/Resume";
import { IJob } from "../models/Job";

async function processResumeScoring(job: Job<ResumeScoreJobData>) {
  const { applicationId, resumeId, jobId } = job.data;

  const [resumeResult, jobResult] = await Promise.all([
    pool.query<IResume>(
      `SELECT id, candidate_id AS "candidateId", file_url AS "fileUrl", parsed_text AS "parsedText",
       extracted_name AS "extractedName", extracted_email AS "extractedEmail", extracted_phone AS "extractedPhone",
       extracted_skills AS "extractedSkills", extracted_experience::float8 AS "extractedExperience", uploaded_at AS "uploadedAt"
       FROM resumes WHERE id = $1`, [resumeId]
    ),
    pool.query<IJob>(
      `SELECT id, recruiter_id AS "recruiterId", title, description, required_skills AS "requiredSkills",
       experience_required::float8 AS "experienceRequired", status, created_at AS "createdAt" FROM jobs WHERE id = $1`, [jobId]
    ),
  ]);
  const resume = resumeResult.rows[0];
  const jobPosting = jobResult.rows[0];

  if (!resume) throw new Error(`Resume ${resumeId} not found`);
  if (!jobPosting) throw new Error(`Job ${jobId} not found`);
  if (!resume.parsedText) {
    throw new Error(`Resume ${resumeId} has no parsedText; run parse-resume first`);
  }

  const requiredSkills = jobPosting.requiredSkills ?? [];
  const result = await scoreResume({
    resume_text: resume.parsedText,
    job_description: jobPosting.description,
    required_skills: requiredSkills,
    infer_skills_if_empty: requiredSkills.length === 0,
    resume_experience_years: resume.extractedExperience ?? undefined,
    required_experience_years: jobPosting.experienceRequired ?? undefined,
  });

  await pool.query(
    "UPDATE applications SET match_score = $2, status = 'scored' WHERE id = $1",
    [applicationId, result.match_score]
  );

  // Backfill the resume-level fields the scoring engine derived, but only when
  // they're missing — the parser is the better source of truth when it
  // succeeded. Collected into a single update instead of writing the same
  // extractedSkills value two or three times.
  await pool.query(
    `UPDATE resumes
     SET extracted_experience = COALESCE(extracted_experience, $2),
         extracted_skills = CASE WHEN cardinality(extracted_skills) = 0 THEN $3 ELSE extracted_skills END
     WHERE id = $1`,
    [resumeId, result.resume_experience_years, result.resume_skills_found]
  );

  return result;
}

export const resumeWorker = new Worker<ResumeScoreJobData>(
  "resume-scoring",
  processResumeScoring,
  {
    connection: redisConnection,
    concurrency: env.resumeQueueConcurrency,
  }
);

resumeWorker.on("completed", (job) => {
  console.log(`✅ [resumeWorker] job ${job.id} completed for application ${job.data.applicationId}`);
});

resumeWorker.on("failed", async (job, err) => {
  console.error(`❌ [resumeWorker] job ${job?.id} failed:`, err.message);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await pool.query("UPDATE applications SET status = 'failed' WHERE id = $1", [job.data.applicationId]).catch(
      (e) => console.error("[resumeWorker] failed to set status=failed:", e)
    );
  }
});

process.on("SIGTERM", async () => {
  await resumeWorker.close();
  process.exit(0);
});
