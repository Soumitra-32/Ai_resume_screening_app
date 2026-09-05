import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import { resumeApi } from '@/services/resumeApi';
import ResumeUpload from '@/components/ResumeUpload';
import type { Job, Resume } from '@/types';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const jobData = await jobApi.get(jobId);
        setJob(jobData);
      } catch {
        setLoadError('Could not load this role.');
      }
    })();
  }, [jobId]);

  // 7.10 — check whether the candidate already applied, so reloading
  // the page doesn't show the application form again.
  useEffect(() => {
    if (!jobId) return;
    (async () => {
      setIsCheckingStatus(true);
      try {
        const applications = await resumeApi.myApplications();
        const existing = applications.some((app) => {
          const appliedJobId = typeof app.jobId === 'string' ? app.jobId : app.jobId.id;
          return appliedJobId === jobId;
        });
        setHasApplied(existing);
      } catch {
        // Non-fatal: if this check fails, fall through and let the
        // apply button's own duplicate-application handling (409) catch it.
      } finally {
        setIsCheckingStatus(false);
      }
    })();
  }, [jobId]);

  async function handleApply() {
    if (!jobId || !resume) return;
    setIsApplying(true);
    setError(null);
    try {
      await resumeApi.applyToJob(jobId, resume.id);
      setHasApplied(true);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setHasApplied(true);
      } else {
        setError(err?.response?.data?.error ?? 'Could not submit your application. Try again.');
      }
    } finally {
      setIsApplying(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-flag">{loadError}</p>;
  }

  if (!job || isCheckingStatus) {
    return <p className="text-sm text-ink-600">Loading role…</p>;
  }

  return (
    <div>
      <Link to="/candidate/jobs" className="text-sm text-ink-600 hover:text-signal">
        ← All roles
      </Link>

      <div className="mt-3 mb-8">
        <h1 className="font-display text-2xl text-paper">{job.title}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {job.experienceRequired != null ? `${job.experienceRequired}+ years experience` : 'No experience requirement specified'}
        </p>
      </div>

      <div className="card mb-6 p-6">
        <p className="whitespace-pre-line text-sm text-paper">{job.description}</p>
        <div className="mt-4 flex flex-wrap gap-1">
          {job.requiredSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-ink-600"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {hasApplied ? (
        <div className="card border-signal/50 p-6 text-center">
          <p className="font-display text-paper">Application submitted</p>
          <p className="mt-1 text-sm text-ink-600">
            We'll score your resume against this role and notify you of updates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-lg text-paper">Submit your resume</h2>
          {resume ? (
            <div className="card flex items-center justify-between p-4">
              <p className="text-sm text-paper">Resume uploaded — ready to submit.</p>
              <button className="text-xs text-ink-600 hover:text-signal" onClick={() => setResume(null)}>
                Replace
              </button>
            </div>
          ) : (
                 <ResumeUpload jobId={jobId} onUploaded={(r) => { setResume(r); setHasApplied(true); }} />
          )}

          {error && <p className="text-sm text-flag">{error}</p>}

          <button className="btn-primary" disabled={!resume || isApplying} onClick={handleApply}>
            {isApplying ? 'Submitting…' : 'Apply to this role'}
          </button>
        </div>
      )}
    </div>
  );
}