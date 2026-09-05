export interface Skill {
  name: string;
  matched: boolean;
}

export interface Candidate {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  matchScore: number | null;
  experienceYears: number;
  skills: Skill[];
  resumeUrl: string;
  resumeText: string;
  status: 'pending' | 'scored' | 'shortlisted' | 'rejected' | 'hired' | 'failed';
  appliedAt: string;
}

export interface RankingFilters {
  minScore: number;
  minExperience: number;
  skills: string[];
  status: string;
  search: string;
}

export type SortField = 'matchScore' | 'experienceYears' | 'appliedAt' | 'name';
export type SortOrder = 'asc' | 'desc';