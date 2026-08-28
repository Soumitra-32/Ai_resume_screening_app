import axios from 'axios';
import { Candidate, RankingFilters } from '../types/candidate';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const candidateApi = {
  async getRankedCandidates(jobId: string, filters: Partial<RankingFilters>, sortField: string, sortOrder: string) {
    const params = new URLSearchParams();
    if (filters.minScore) params.append('minScore', String(filters.minScore));
    if (filters.minExperience) params.append('minExperience', String(filters.minExperience));
    if (filters.skills?.length) params.append('skills', filters.skills.join(','));
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    params.append('sortField', sortField);
    params.append('sortOrder', sortOrder);

    const res = await axios.get<Candidate[]>(
      `${API_BASE}/jobs/${jobId}/candidates?${params.toString()}`,
      { withCredentials: true }
    );
    return res.data;
  },

  async updateStatus(applicationId: string, status: string) {
    const res = await axios.patch(
      `${API_BASE}/applications/${applicationId}/status`,
      { status },
      { withCredentials: true }
    );
    return res.data;
  },

  async getAvailableSkills(jobId: string) {
    const res = await axios.get<string[]>(`${API_BASE}/jobs/${jobId}/skills`, {
      withCredentials: true,
    });
    return res.data;
  },
};