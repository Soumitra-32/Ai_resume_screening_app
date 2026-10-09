import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import { resumeApi } from '@/services/resumeApi';
import ResumeUpload from '@/components/ResumeUpload';
import { useNotifications } from '@/hooks/useNotifications';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Job, Resume } from '@/types';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [existingResumes, setExistingResumes] = useState<Resume[]>([]);
  const [hasApplied, setHasApplied] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotifications();
  usePageTitle(job ? `Apply · ${job.title}` : 'Apply');

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

  // Load the candidate's saved resumes so they can reuse one instead of
  // re-uploading it for every application.
  useEffect(() => {
    (async () => {
      try {
        setExistingResumes(await resumeApi.mine());
      } catch {
        // Non-fatal: the upload path still works.
      }
    })();
  }, []);

  async function handleApply() {
    if (!jobId || !resume) return;
    setIsApplying(true);
    setError(null);
    try {
      await resumeApi.applyToJob(jobId, resume.id);
      setHasApplied(true);
      notify('Application submitted', 'success');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { status?: number } }).response === 'object'
      ) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 409) {
          setHasApplied(true);
          return;
        }
      }
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
          ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error as string)
          : 'Could not submit your application. Try again.';
      setError(message);
      notify(message, 'error');
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
            <ResumeSummaryCard resume={resume} onReplace={() => setResume(null)} />
          ) : (
            <>
              {existingResumes.length > 0 && (
                <div className="card p-4">
                  <p className="field-label">Use a saved resume</p>
                  <div className="mt-2 space-y-2">
                    {existingResumes.map((r) => (
                      <button
                        key={r.id}
                        className="flex w-full items-center justify-between rounded-sm border border-line px-3 py-2 text-left text-sm text-paper hover:border-signal"
                        onClick={() => setResume(r)}
                      >
                        <span className="truncate">
                          {r.extractedName ?? r.fileUrl.split(/[\\/]/).pop() ?? 'Resume'}
                        </span>
                        <span className="text-xs text-signal">Use</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-ink-600">or upload a new one below</p>
                </div>
              )}
              <ResumeUpload onUploaded={setResume} />
            </>
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

/** Shows what the AI parsed out of the resume before the candidate commits. */
function ResumeSummaryCard({ resume, onReplace }: { resume: Resume; onReplace: () => void }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-paper">Resume ready — review what we parsed</p>
        <button className="text-xs text-ink-600 hover:text-signal" onClick={onReplace}>
          Replace
        </button>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {resume.extractedExperience != null && (
          <p className="text-ink-600">
            <span className="text-paper">{resume.extractedExperience}</span> years experience detected
          </p>
        )}

        {resume.extractedSkills && resume.extractedSkills.length > 0 ? (
          <div>
            <p className="field-label">Detected skills</p>
            <div className="flex flex-wrap gap-1">
              {resume.extractedSkills.slice(0, 16).map((skill) => (
                <span
                  key={skill}
                  className="rounded-sm border border-signal/40 bg-signal/10 px-2 py-0.5 font-mono text-[11px] text-signal"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-600">No skills were auto-detected — the recruiter will review the full text.</p>
        )}
      </div>
    </div>
  );
}