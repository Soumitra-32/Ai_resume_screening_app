import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import JobPostForm from '@/components/JobPostForm';
import type { Job, JobInput } from '@/types';

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await jobApi.list();
      setJobs(data);
    } catch {
      setLoadError('Could not load your jobs.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(payload: JobInput) {
    const job = await jobApi.create(payload);
    setJobs((prev) => [job, ...prev]);
    setShowForm(false);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-paper">Your job postings</h1>
          <p className="mt-1 text-sm text-ink-600">Post a role, then rank candidates as resumes come in.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Post a job'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <JobPostForm submitLabel="Post job" onSubmit={handleCreate} />
        </div>
      )}

      {loadError && <p className="text-sm text-flag">{loadError}</p>}

      {isLoading ? (
        <p className="text-sm text-ink-600">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-paper">No jobs posted yet.</p>
          <p className="mt-1 text-sm text-ink-600">Post your first role to start receiving applicants.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/recruiter/jobs/${job.id}/candidates`}
              className="card flex items-center justify-between p-5 transition hover:border-signal"
            >
              <div>
                <p className="font-display text-lg text-paper">{job.title}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.requiredSkills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-ink-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-signal">{job.applicantCount ?? 0}</p>
                <p className="text-xs text-ink-600">applicants</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}