export type ApplicationStatus = "pending" | "scored" | "shortlisted" | "rejected" | "hired" | "failed";

export interface IApplication {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId: string;
  matchScore: number | null;
  status: ApplicationStatus;
  appliedAt: Date;
}
