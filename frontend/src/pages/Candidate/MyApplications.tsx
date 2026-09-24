import { useEffect, useState } from 'react';
import { resumeApi } from '@/services/resumeApi';
import ScoreBadge from '@/components/ScoreBadge';
import type { Application } from '@/types';

export default function MyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await resumeApi.myApplications();
        setApplications(data);
      } catch {
        setError('Could not load your applications.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleRetry(applicationId: string) {
    setRetryingId(applicationId);
    setError(null);
    try {
      await resumeApi.retryScoring(applicationId);
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: 'pending' } : app))
      );
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Could not restart scoring for this application.';
      setError(message);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-paper">Your applications</h1>
      <p className="mt-1 text-sm text-ink-600">Track status and match scores across every role you've applied to.</p>

      {isLoading ? (
        <p className="mt-8 text-sm text-ink-600">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-flag">{error}</p>
      ) : applications.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-paper">You haven't applied to any roles yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {applications.map((app) => {
            // jobId is populated by GET /applications/mine, so show the role
            // the candidate actually applied to instead of a raw ObjectId.
            const job = typeof app.jobId === 'string' ? null : app.jobId;

            return (
              <div
                key={app.id}
                className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <ScoreBadge score={app.matchScore} size="sm" />
                  <div>
                    <p className="text-sm text-paper">{job?.title ?? 'Role no longer available'}</p>
                    <p className="text-xs capitalize text-ink-600">{app.status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {app.status === 'failed' && (
                    <button
                      className="text-xs text-signal hover:underline disabled:opacity-50"
                      onClick={() => handleRetry(app.id)}
                      disabled={retryingId === app.id}
                    >
                      {retryingId === app.id ? 'Retrying…' : 'Retry scoring'}
                    </button>
                  )}
                  <p className="text-xs text-ink-600">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}