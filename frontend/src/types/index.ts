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
  experienceRequired?: number;
  status: 'draft' | 'open' | 'closed' | 'archived'; // also add this — see backend Job.status fix from earlier
  createdAt: string;
  applicantCount?: number;
}

export interface JobInput {
  title: string;
  description: string;
  requiredSkills: string[];
  experienceRequired?: number;
  status?: 'draft' | 'open' | 'closed' | 'archived';
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

export type ApplicationStatus = 'pending' | 'scored' | 'shortlisted' | 'rejected' | 'hired' | 'failed';

export interface Application {
  id: string;
  jobId: string | Job;          // populated in myApplications()
  resumeId: string | Resume;    // populated in myApplications()
  matchScore: number | null;
  status: ApplicationStatus;
  appliedAt: string;
  candidateName?: string;
  candidateEmail?: string;
  extractedSkills?: string[];
  extractedExperience?: number;
}