import { apiClient } from './apiClient';
import type { Application, Resume } from '@/types';

export const resumeApi = {
  async upload(file: File, onProgress?: (pct: number) => void): Promise<Resume> {
    const form = new FormData();
    form.append('resume', file);
    const { data } = await apiClient.post<Resume>('/resumes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
    return data;
  },

  async mine(): Promise<Resume[]> {
    const { data } = await apiClient.get<Resume[]>('/resumes/mine');
    return data;
  },

  async applyToJob(jobId: string, resumeId: string): Promise<Application> {
    const { data } = await apiClient.post<Application>(`/jobs/${jobId}/apply`, { resumeId });
    return data;
  },

  async myApplications(): Promise<Application[]> {
    const { data } = await apiClient.get<Application[]>('/applications/mine');
    return data;
  },
};