import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { candidateApi, type Pagination } from '../../services/candidateApi';
import ScoreBadge from '../../components/ScoreBadge';
import RankingFiltersPanel from '../../components/RankingFiltersPanel';
import ResumePreviewModal from '../../components/ResumePreviewModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import PaginationBar from '../../components/Pagination';
import { SkeletonTableRows } from '../../components/Skeleton';
import { useNotifications } from '../../hooks/useNotifications';
import { usePageTitle } from '../../hooks/usePageTitle';
import { downloadCsv } from '../../utils/csv';
import { copyToClipboard } from '../../hooks/useSavedJobs';
import {
  Candidate,
  RankingFilters,
  SortField,
  SortOrder,
} from '../../types/candidate';
import type { ApplicationStatus } from '../../types';

function SortHeader({
  field,
  label,
  sortField,
  sortOrder,
  onToggle,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortOrder: SortOrder;
  onToggle: (field: SortField) => void;
}) {
  return (
    <th
      onClick={() => onToggle(field)}
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600 hover:bg-ink-800/60"
    >
      {label}{' '}
      {sortField === field
        ? sortOrder === 'asc'
          ? '↑'
          : '↓'
        : ''}
    </th>
  );
}

export default function CandidateRanking() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  usePageTitle('Candidate Ranking');

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCandidate, setPreviewCandidate] =
    useState<Candidate | null>(null);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [sortField, setSortField] = useState<SortField>('matchScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingBulkStatus, setPendingBulkStatus] = useState<ApplicationStatus | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Restore filters/sort/page from the URL so a filtered view is shareable
  // and survives a refresh.
  const [filters, setFilters] = useState<RankingFilters>(() => ({
    minScore: Number(searchParams.get('minScore')) || 0,
    minExperience: Number(searchParams.get('minExperience')) || 0,
    skills: searchParams.get('skills') ? searchParams.get('skills')!.split(',').filter(Boolean) : [],
    status: searchParams.get('status') ?? '',
    search: searchParams.get('search') ?? '',
  }));
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));

  const { notify } = useNotifications();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!jobId) return;

    candidateApi
      .getAvailableSkills(jobId)
      .then(setAvailableSkills)
      .catch(() => {});
  }, [jobId]);

  // "/" focuses the search box for fast filtering (unless already typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Persist filters/sort/page to the URL (without cluttering history).
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.minScore) params.set('minScore', String(filters.minScore));
    if (filters.minExperience) params.set('minExperience', String(filters.minExperience));
    if (filters.skills.length) params.set('skills', filters.skills.join(','));
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (sortField !== 'matchScore') params.set('sortField', sortField);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [filters, sortField, sortOrder, page, setSearchParams]);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-filter-change pattern: show spinner while refetching
    setLoading(true);

    candidateApi
      .getRankedCandidates(jobId, filters, sortField, sortOrder, page)
      .then((result) => {
        if (!cancelled) {
          setCandidates(result.data);
          setPagination(result.pagination);
        }
      })
      .catch(() => {
        if (!cancelled) notify('Failed to load candidates', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, filters, sortField, sortOrder, page, notify]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleStatusChange = async (
    applicationId: string,
    status: ApplicationStatus
  ) => {
    try {
      await candidateApi.updateStatus(applicationId, status);

      setCandidates((prev) =>
        prev.map((c) =>
          c.applicationId === applicationId
            ? { ...c, status }
            : c
        )
      );

      notify(`Candidate marked as ${status}`, 'success');
    } catch {
      notify('Failed to update status', 'error');
    }
  };

  const toggleSelected = (applicationId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  };

  const allOnPageSelected =
    candidates.length > 0 && candidates.every((c) => selected.has(c.applicationId));

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        candidates.forEach((c) => next.delete(c.applicationId));
      } else {
        candidates.forEach((c) => next.add(c.applicationId));
      }
      return next;
    });
  };

  const confirmBulkStatus = async () => {
    if (!pendingBulkStatus || selected.size === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        [...selected].map((applicationId) =>
          candidateApi.updateStatus(applicationId, pendingBulkStatus)
        )
      );
      setCandidates((prev) =>
        prev.map((c) => (selected.has(c.applicationId) ? { ...c, status: pendingBulkStatus } : c))
      );
      notify(`${selected.size} candidate${selected.size === 1 ? '' : 's'} marked as ${pendingBulkStatus}`, 'success');
      setSelected(new Set());
      setPendingBulkStatus(null);
    } catch {
      notify('Failed to update some candidates', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportCsv = () => {
    if (candidates.length === 0) return;
    const rows: (string | number | null)[][] = [
      ['Name', 'Email', 'Match Score (%)', 'Experience (yrs)', 'Matched Skills', 'Status', 'Applied At'],
      ...candidates.map((c) => [
        c.name,
        c.email,
        c.matchScore == null ? '' : Math.round(c.matchScore * 100),
        c.experienceYears,
        c.skills.filter((s) => s.matched).map((s) => s.name).join('; '),
        c.status,
        new Date(c.appliedAt).toISOString(),
      ]),
    ];
    downloadCsv(`candidates-job-${jobId ?? 'export'}.csv`, rows);
    notify('Candidate list exported', 'success');
  };

  const handleCopyEmail = async (email: string) => {
    const ok = await copyToClipboard(email);
    notify(ok ? `Copied ${email}` : 'Could not copy email', ok ? 'success' : 'error');
  };


  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div className="md:col-span-1">
        <RankingFiltersPanel
          availableSkills={availableSkills}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          searchInputRef={searchInputRef}
        />
      </div>

      <div className="md:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl text-paper">
            Candidate Ranking
          </h1>

          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <>
                <span className="text-xs text-ink-600">{selected.size} selected</span>
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  disabled={isBulkUpdating}
                  onClick={() => setPendingBulkStatus('shortlisted')}
                >
                  Shortlist
                </button>
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  disabled={isBulkUpdating}
                  onClick={() => setPendingBulkStatus('rejected')}
                >
                  Reject
                </button>
              </>
            )}
            <button
              className="btn-secondary px-3 py-1 text-xs"
              onClick={handleExportCsv}
              disabled={candidates.length === 0}
            >
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonTableRows count={5} />
        ) : candidates.length === 0 ? (
          <p className="text-sm text-ink-600">
            No candidates match the current filters.
          </p>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-ink-800">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all candidates on this page"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        className="accent-signal"
                      />
                    </th>
                  <SortHeader
                    field="name"
                    label="Candidate"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onToggle={toggleSort}
                  />

                  <SortHeader
                    field="matchScore"
                    label="Score"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onToggle={toggleSort}
                  />

                  <SortHeader
                    field="experienceYears"
                    label="Experience"
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onToggle={toggleSort}
                  />

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">
                    Skills
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {candidates.map((c) => (
                  <tr
                    key={c.applicationId}
                    className="hover:bg-ink-800/40"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.name}`}
                        checked={selected.has(c.applicationId)}
                        onChange={() => toggleSelected(c.applicationId)}
                        className="accent-signal"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-paper">
                        {c.name}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-ink-600">
                        {c.email}
                        <button
                          onClick={() => handleCopyEmail(c.email)}
                          className="text-signal hover:underline"
                          title="Copy email"
                        >
                          Copy
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <ScoreBadge score={c.matchScore} />
                    </td>

                    <td className="px-4 py-3 text-sm text-paper/80">
                      {c.experienceYears} yrs
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {c.skills
                          .filter((s) => s.matched)
                          .slice(0, 4)
                          .map((s) => (
                            <span
                              key={s.name}
                              className="rounded-sm border border-signal/40 bg-signal/10 px-2 py-0.5 font-mono text-[11px] text-signal"
                            >
                              {s.name}
                            </span>
                          ))}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) =>
                          handleStatusChange(
                            c.applicationId,
                            e.target.value as ApplicationStatus
                          )
                        }
                        className="field-input w-auto py-1 text-xs"
                      >
                        <option value="pending">
                          Pending
                        </option>

                        <option value="scored">
                          Scored
                        </option>

                        <option value="shortlisted">
                          Shortlisted
                        </option>

                        <option value="rejected">
                          Rejected
                        </option>

                        <option value="hired">
                          Hired
                        </option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setPreviewCandidate(c)
                        }
                        className="text-sm text-signal hover:underline"
                      >
                        View Resume
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
          </>
        )}
      </div>

      {previewCandidate && (
        <ResumePreviewModal
          candidate={previewCandidate}
          onClose={() =>
            setPreviewCandidate(null)
          }
        />
      )}

      <ConfirmDialog
        open={pendingBulkStatus !== null}
        title={`Mark ${selected.size} candidate${selected.size === 1 ? '' : 's'} as ${pendingBulkStatus ?? ''}?`}
        message="This updates the status for every selected candidate on this page."
        confirmLabel="Update"
        isBusy={isBulkUpdating}
        onConfirm={confirmBulkStatus}
        onCancel={() => setPendingBulkStatus(null)}
      />
    </div>
  );
}