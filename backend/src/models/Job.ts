export type JobStatus = "draft" | "open" | "closed" | "archived";

export interface IJob {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  experienceRequired: number | null;
  status: JobStatus;
  createdAt: Date;
}
