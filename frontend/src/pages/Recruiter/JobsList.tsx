import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import JobPostForm from '@/components/JobPostForm';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SkeletonList } from '@/components/Skeleton';
import { useNotifications } from '@/hooks/useNotifications';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Job, JobInput } from '@/types';

const JOB_STATUSES: Job['status'][] = ['draft', 'open', 'closed', 'archived'];

export default function JobsList() {
  usePageTitle('Your job postings');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Job | null>(null);
  const { notify } = useNotifications();

  useEffect(() => {
    let cancelled = false;
    async function loadJobs() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await jobApi.list();
        if (!cancelled) setJobs(data);
      } catch {
        if (!cancelled) setLoadError('Could not load your jobs.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadJobs();
    return () => { cancelled = true; };
  }, []);

  async function handleCreate(payload: JobInput) {
    const job = await jobApi.create(payload);
    setJobs((prev) => [job, ...prev]);
    setShowForm(false);
    notify('Job posted', 'success');
  }

  async function handleUpdate(jobId: string, payload: JobInput) {
    setActionError(null);
    const updated = await jobApi.update(jobId, payload);
    setJobs((prev) => prev.map((job) => job.id === jobId ? { ...job, ...updated } : job));
    setEditingJobId(null);
    notify('Job updated', 'success');
  }

  async function handleStatusChange(job: Job, status: Job['status']) {
    setBusyJobId(job.id);
    setActionError(null);
    try {
      const updated = await jobApi.update(job.id, { status });
      setJobs((prev) => prev.map((item) => item.id === job.id ? { ...item, ...updated } : item));
    } catch {
      setActionError(`Could not update the status for “${job.title}”.`);
    } finally {
      setBusyJobId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusyJobId(pendingDelete.id);
    setActionError(null);
    try {
      await jobApi.remove(pendingDelete.id);
      setJobs((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      if (editingJobId === pendingDelete.id) setEditingJobId(null);
      notify('Job deleted', 'success');
      setPendingDelete(null);
    } catch {
      setActionError(`Could not delete “${pendingDelete.title}”.`);
      notify('Could not delete this job.', 'error');
    } finally {
      setBusyJobId(null);
    }
  }

  const stats = computeStats(jobs);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-paper">Your job postings</h1>
          <p className="mt-1 text-sm text-ink-600">Post a role, then rank candidates as resumes come in.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm((v) => !v); setEditingJobId(null); }}>
          {showForm ? 'Cancel' : 'Post a job'}
        </button>
      </div>

      {showForm && <div className="mb-8"><JobPostForm submitLabel="Post job" onSubmit={handleCreate} /></div>}
      {loadError && <p role="alert" className="mb-4 text-sm text-flag">{loadError}</p>}
      {actionError && <p role="alert" className="mb-4 text-sm text-flag">{actionError}</p>}

      {!isLoading && jobs.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Open roles" value={stats.open} />
          <StatCard label="Total roles" value={stats.total} />
          <StatCard label="Applicants" value={stats.applicants} hint="across all roles" />
          <StatCard label="Avg. applicants" value={stats.avgApplicants} hint="per role" />
        </div>
      )}

      {isLoading ? (
        <SkeletonList count={3} />
      ) : jobs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-paper">No jobs posted yet.</p>
          <p className="mt-1 text-sm text-ink-600">Post your first role to start receiving applicants.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <article key={job.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link to={`/recruiter/jobs/${job.id}/candidates`} className="font-display text-lg text-paper hover:text-signal">
                    {job.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 5).map((skill) => (
                      <span key={skill} className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-ink-600">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-signal">{job.applicantCount ?? 0}</p>
                  <p className="text-xs text-ink-600">applicants</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  Status
                  <select aria-label={`Status for ${job.title}`} className="field-input w-auto py-1 capitalize" value={job.status}
                    disabled={busyJobId === job.id} onChange={(event) => void handleStatusChange(job, event.target.value as Job['status'])}>
                    {JOB_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <button className="btn-secondary" disabled={busyJobId === job.id} onClick={() => { setShowForm(false); setEditingJobId(editingJobId === job.id ? null : job.id); }}>
                  {editingJobId === job.id ? 'Cancel edit' : 'Edit'}
                </button>
                <button className="btn-secondary border-flag/50 text-flag hover:border-flag" disabled={busyJobId === job.id} onClick={() => setPendingDelete(job)}>
                  Delete
                </button>
              </div>

              {editingJobId === job.id && (
                <div className="mt-4">
                  <JobPostForm key={job.id} initial={job} submitLabel="Save changes" onSubmit={(payload) => handleUpdate(job.id, payload)} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete job?"
        message={`“${pendingDelete?.title ?? ''}” and all of its applications will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        isBusy={busyJobId === pendingDelete?.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function computeStats(jobs: Job[]) {
  const total = jobs.length;
  const open = jobs.filter((j) => j.status === 'open').length;
  const applicants = jobs.reduce((sum, j) => sum + (j.applicantCount ?? 0), 0);
  const avgApplicants = total > 0 ? (applicants / total).toFixed(1) : '0';
  return { total, open, applicants, avgApplicants };
}
