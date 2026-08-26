import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import CandidateCard from '@/components/CandidateCard';
import type { Application, ApplicationStatus, Job } from '@/types';

type SortKey = 'score' | 'recent';

export default function CandidateRanking() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      setIsLoading(true);
      const [jobData, applicantsData] = await Promise.all([jobApi.get(jobId), jobApi.applicants(jobId)]);
      setJob(jobData);
      setApplications(applicantsData);
      setIsLoading(false);
    })();
  }, [jobId]);

  const visible = useMemo(() => {
    const filtered = applications.filter((a) => (a.matchScore ?? 0) >= minScore);
    return [...filtered].sort((a, b) => {
      if (sortKey === 'score') return (b.matchScore ?? -1) - (a.matchScore ?? -1);
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });
  }, [applications, sortKey, minScore]);

  async function handleStatusChange(applicationId: string, status: ApplicationStatus) {
    if (!jobId) return;
    setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)));
    try {
      await jobApi.updateApplicationStatus(jobId, applicationId, status);
    } catch {
      setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: a.status } : a)));
    }
  }

  return (
    <div>
      <Link to="/recruiter/jobs" className="text-sm text-ink-600 hover:text-signal">
        ← All jobs
      </Link>

      {job && (
        <div className="mt-3 mb-8">
          <h1 className="font-display text-2xl text-paper">{job.title}</h1>
          <p className="mt-1 text-sm text-ink-600">{applications.length} candidates ranked by match score</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-ink-600" htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            className="field-input w-auto py-1.5 text-xs"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="score">Match score</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-ink-600" htmlFor="minScore">
            Min score: {minScore}
          </label>
          <input
            id="minScore"
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-600">Loading candidates…</p>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-paper">No candidates match these filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((application) => (
            <CandidateCard
              key={application.id}
              application={application}
              onStatusChange={(status) => handleStatusChange(application.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}