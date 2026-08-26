export type UserRole = 'recruiter' | 'candidate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  experienceRequired: number;
  createdAt: string;
  applicantCount?: number;
}

export interface JobInput {
  title: string;
  description: string;
  requiredSkills: string[];
  experienceRequired: number;
}

export interface Resume {
  id: string;
  candidateId: string;
  fileUrl: string;
  parsedText?: string;
  extractedSkills?: string[];
  extractedExperience?: number;
  uploadedAt: string;
}

export type ApplicationStatus = 'pending' | 'reviewing' | 'shortlisted' | 'rejected';

export interface Application {
  id: string;
  jobId: string;
  resumeId: string;
  matchScore: number | null;
  status: ApplicationStatus;
  appliedAt: string;
  candidateName?: string;
  candidateEmail?: string;
  extractedSkills?: string[];
  extractedExperience?: number;
}