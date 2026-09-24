import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { ResumeScoreJobData } from "./resumeQueue";
import { Resume, type IResume } from "../models/Resume";
import { Job as JobModel } from "../models/Job";
import { Application } from "../models/Application";
import { scoreResume } from "../services/mlServiceClient";
import { env } from "../config/env";

async function processResumeScoring(job: Job<ResumeScoreJobData>) {
  const { applicationId, resumeId, jobId } = job.data;

  const [resume, jobPosting] = await Promise.all([
    Resume.findById(resumeId),
    JobModel.findById(jobId),
  ]);

  if (!resume) throw new Error(`Resume ${resumeId} not found`);
  if (!jobPosting) throw new Error(`Job ${jobId} not found`);
  if (!resume.parsedText) {
    throw new Error(`Resume ${resumeId} has no parsedText; run parse-resume first`);
  }

  const result = await scoreResume({
    resume_text: resume.parsedText,
    job_description: jobPosting.description,
    required_skills: jobPosting.requiredSkills ?? [],
    resume_experience_years: resume.extractedExperience ?? undefined,
    required_experience_years: jobPosting.experienceRequired ?? undefined,
  });

  await Application.findByIdAndUpdate(applicationId, {
    matchScore: result.match_score,
    status: "scored",
  });

  // Backfill the resume-level fields the scoring engine derived, but only when
  // they're missing — the parser is the better source of truth when it
  // succeeded. Collected into a single update instead of writing the same
  // extractedSkills value two or three times.
  const backfill: Partial<Pick<IResume, "extractedExperience" | "extractedSkills">> = {};

  if (resume.extractedExperience == null && result.resume_experience_years != null) {
    backfill.extractedExperience = result.resume_experience_years;
  }
  if (!resume.extractedSkills || resume.extractedSkills.length === 0) {
    backfill.extractedSkills = result.resume_skills_found;
  }
  if (Object.keys(backfill).length > 0) {
    await Resume.findByIdAndUpdate(resumeId, backfill);
  }

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
    await Application.findByIdAndUpdate(job.data.applicationId, { status: "failed" }).catch(
      (e) => console.error("[resumeWorker] failed to set status=failed:", e)
    );
  }
});

process.on("SIGTERM", async () => {
  await resumeWorker.close();
  process.exit(0);
});