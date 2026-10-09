import { apiClient } from './apiClient';
import type { Candidate, RankingFilters } from '../types/candidate';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RankedCandidatesResult {
  data: Candidate[];
  pagination: Pagination;
}

export const candidateApi = {
  async getRankedCandidates(
    jobId: string,
    filters: Partial<RankingFilters>,
    sortField: string,
    sortOrder: string,
    page = 1,
    limit = 20
  ): Promise<RankedCandidatesResult> {
    const params = new URLSearchParams();

    if (filters.minScore !== undefined) {
      params.append('minScore', String(filters.minScore));
    }

    if (filters.minExperience !== undefined) {
      params.append('minExperience', String(filters.minExperience));
    }

    if (filters.skills?.length) {
      params.append('skills', filters.skills.join(','));
    }

    if (filters.status) {
      params.append('status', filters.status);
    }

    if (filters.search) {
      params.append('search', filters.search);
    }

    params.append('sortField', sortField);
    params.append('sortOrder', sortOrder);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const { data } = await apiClient.get<RankedCandidatesResult>(
      `/candidates/jobs/${jobId}/candidates?${params.toString()}`
    );

    return {
      data: data.data ?? [],
      pagination: data.pagination ?? { page, limit, total: data.data?.length ?? 0, totalPages: 1 },
    };
  },

  async updateStatus(applicationId: string, status: string) {
    const { data } = await apiClient.patch(
      `/candidates/applications/${applicationId}/status`,
      { status }
    );

    return data;
  },

  async getAvailableSkills(jobId: string) {
    const { data } = await apiClient.get<string[]>(
      `/candidates/jobs/${jobId}/skills`
    );

    return data;
  },
};
