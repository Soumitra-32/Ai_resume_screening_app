import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { ResumeScoreJobData } from "./resumeQueue";
import { Resume } from "../models/Resume";
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
  required_experience_years: jobPosting.experienceRequired ?? undefined, // fix #12
});

await Application.findByIdAndUpdate(applicationId, {
  matchScore: result.match_score,
  status: "scored",
});

// fix #13: there's no result.skills / result.experience — use the real field names
await Resume.findByIdAndUpdate(resumeId, {
  extractedSkills: result.resume_skills_found,
  // ScoreResponse has no total "years" figure, only experience_match (a 0-1 ratio).
  // Keep whatever extractedExperience Resume already had — it isn't returned by scoring.
});
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