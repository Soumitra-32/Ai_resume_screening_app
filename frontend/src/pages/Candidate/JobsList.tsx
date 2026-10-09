import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SkeletonList } from '@/components/Skeleton';
import type { Job } from '@/types';

type SortKey = 'newest' | 'title';

export default function CandidateJobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const { saved, toggle, isSaved } = useSavedJobs();
  usePageTitle('Open roles');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await jobApi.list();
        setJobs(data);
      } catch {
        setLoadError('Could not load open roles. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = jobs.filter((job) =>
      `${job.title} ${job.requiredSkills.join(' ')}`.toLowerCase().includes(q)
    );
    if (showSavedOnly) list = list.filter((job) => isSaved(job.id));
    list = [...list].sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  }, [jobs, query, sort, showSavedOnly, isSaved]);

  return (
    <div>
      <h1 className="font-display text-2xl text-paper">Open roles</h1>
      <p className="mt-1 text-sm text-ink-600">Find a role and submit your resume for scoring.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          className="field-input max-w-sm flex-1"
          placeholder="Search by title or skill…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <label className="flex items-center gap-2 text-xs text-ink-600">
          Sort
          <select
            className="field-input w-auto py-1.5"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </label>

        <button
          className={`btn-secondary px-3 py-2 text-xs ${showSavedOnly ? 'border-signal text-signal' : ''}`}
          onClick={() => setShowSavedOnly((v) => !v)}
          aria-pressed={showSavedOnly}
        >
          ★ Saved{saved.length > 0 ? ` (${saved.length})` : ''}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6">
          <SkeletonList count={4} />
        </div>
      ) : loadError ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-flag">{loadError}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-paper">
            {showSavedOnly && saved.length === 0
              ? 'You haven’t saved any roles yet.'
              : 'No roles match your search.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((job) => {
            const jobIsSaved = isSaved(job.id);
            return (
              <div key={job.id} className="card relative p-5 transition hover:border-signal">
                <button
                  onClick={() => toggle(job.id)}
                  className={`absolute right-4 top-4 text-lg ${jobIsSaved ? 'text-signal' : 'text-ink-600 hover:text-signal'}`}
                  aria-label={jobIsSaved ? 'Remove from saved' : 'Save this role'}
                  aria-pressed={jobIsSaved}
                  title={jobIsSaved ? 'Remove from saved' : 'Save this role'}
                >
                  {jobIsSaved ? '★' : '☆'}
                </button>

                <Link to={`/candidate/jobs/${job.id}`} className="block pr-8">
                  <p className="font-display text-lg text-paper">{job.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">{job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-ink-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}