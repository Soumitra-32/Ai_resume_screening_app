import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export interface ResumeScoreJobData {
  applicationId: string;
  resumeId: string;
  jobId: string;
}

export const resumeQueue = new Queue<ResumeScoreJobData>("resume-scoring", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

export async function enqueueResumeScoring(data: ResumeScoreJobData) {
  return resumeQueue.add("score-resume", data);
}