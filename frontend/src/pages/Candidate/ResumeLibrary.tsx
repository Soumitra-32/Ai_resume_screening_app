import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resumeApi } from '@/services/resumeApi';
import { useNotifications } from '@/hooks/useNotifications';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SkeletonList } from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Resume } from '@/types';

/**
 * Candidate resume library. Surfaces GET /resumes/mine and DELETE /resumes/:id,
 * both of which already existed in the API but had no UI. Lets a candidate reuse
 * a stored resume instead of re-uploading for every application.
 */
export default function ResumeLibrary() {
  usePageTitle('My resumes');

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Resume | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { notify } = useNotifications();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await resumeApi.mine();
        if (!cancelled) setResumes(data);
      } catch {
        if (!cancelled) setError('Could not load your resumes.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await resumeApi.remove(pendingDelete.id);
      setResumes((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      notify('Resume deleted', 'success');
      setPendingDelete(null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not delete this resume.';
      notify(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-paper">My resumes</h1>
      <p className="mt-1 text-sm text-ink-600">
        Reuse a saved resume when applying — no need to upload it again.
      </p>

      {isLoading ? (
        <div className="mt-8">
          <SkeletonList count={3} />
        </div>
      ) : error ? (
        <p className="mt-8 text-sm text-flag">{error}</p>
      ) : resumes.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-paper">You haven&apos;t uploaded any resumes yet.</p>
          <p className="mt-1 text-sm text-ink-600">
            Resumes are saved automatically the first time you apply to a role.
          </p>
          <Link to="/candidate/jobs" className="btn-primary mt-4 inline-flex">
            Browse open roles
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {resumes.map((r) => (
            <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm text-paper">
                  {r.extractedName ?? r.fileUrl.split(/[\\/]/).pop() ?? 'Resume'}
                </p>
                <p className="text-xs text-ink-600">
                  Uploaded {new Date(r.uploadedAt).toLocaleDateString()}
                  {r.extractedExperience != null ? ` · ${r.extractedExperience} yrs experience` : ''}
                </p>
                {r.extractedSkills && r.extractedSkills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.extractedSkills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-ink-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={r.fileUrl}
                  className="text-sm text-signal hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
                <button
                  className="text-sm text-flag hover:underline"
                  onClick={() => setPendingDelete(r)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete resume?"
        message="This permanently removes the resume file. Resumes tied to an active application can't be deleted."
        confirmLabel="Delete"
        destructive
        isBusy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
