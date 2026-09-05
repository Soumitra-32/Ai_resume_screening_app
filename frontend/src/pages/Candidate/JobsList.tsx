import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobApi } from '@/services/jobApi';
import type { Job } from '@/types';

export default function CandidateJobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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

  const filtered = jobs.filter((job) =>
    `${job.title} ${job.requiredSkills.join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-paper">Open roles</h1>
      <p className="mt-1 text-sm text-ink-600">Find a role and submit your resume for scoring.</p>

      <input
        className="field-input mt-6 max-w-sm"
        placeholder="Search by title or skill…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading ? (
        <p className="mt-8 text-sm text-ink-600">Loading roles…</p>
      ) : loadError ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-flag">{loadError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-paper">No roles match your search.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((job) => (
            <Link
              key={job.id}
              to={`/candidate/jobs/${job.id}`}
              className="card block p-5 transition hover:border-signal"
            >
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
          ))}
        </div>
      )}
    </div>
  );
}