import { apiClient } from './apiClient';
import type { Application, Job, JobInput } from '@/types';

export const jobApi = {
  async list(): Promise<Job[]> {
    const { data } = await apiClient.get<Job[]>('/jobs');
    return data;
  },

  async get(jobId: string): Promise<Job> {
    const { data } = await apiClient.get<Job>(`/jobs/${jobId}`);
    return data;
  },

  async create(payload: JobInput): Promise<Job> {
    const { data } = await apiClient.post<Job>('/jobs', payload);
    return data;
  },

  async update(jobId: string, payload: Partial<JobInput>): Promise<Job> {
  const { data } = await apiClient.put<Job>(`/jobs/${jobId}`, payload);
  return data;
},

  async remove(jobId: string): Promise<void> {
    await apiClient.delete(`/jobs/${jobId}`);
  },

  async applicants(jobId: string): Promise<Application[]> {
    const { data } = await apiClient.get<Application[]>(`/jobs/${jobId}/applications`);
    return data;
  },


};