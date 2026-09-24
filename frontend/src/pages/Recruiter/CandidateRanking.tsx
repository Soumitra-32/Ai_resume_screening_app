import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { candidateApi } from '../../services/candidateApi';
import ScoreBadge from '../../components/ScoreBadge';
import RankingFiltersPanel from '../../components/RankingFiltersPanel';
import ResumePreviewModal from '../../components/ResumePreviewModal';
import NotificationToast from '../../components/NotificationToast';
import { useNotifications } from '../../hooks/useNotifications';
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

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCandidate, setPreviewCandidate] =
    useState<Candidate | null>(null);

  const [sortField, setSortField] = useState<SortField>('matchScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [filters, setFilters] = useState<RankingFilters>({
    minScore: 0,
    minExperience: 0,
    skills: [],
    status: '',
    search: '',
  });

  const { notifications, notify, dismiss } = useNotifications();

  useEffect(() => {
    if (!jobId) return;

    candidateApi
      .getAvailableSkills(jobId)
      .then(setAvailableSkills)
      .catch(() => {});
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-filter-change pattern: show spinner while refetching
    setLoading(true);

    candidateApi
      .getRankedCandidates(jobId, filters, sortField, sortOrder)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
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
  }, [jobId, filters, sortField, sortOrder, notify]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
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

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <div className="md:col-span-1">
        <RankingFiltersPanel
          availableSkills={availableSkills}
          onChange={setFilters}
        />
      </div>

      <div className="md:col-span-3">
        <h1 className="mb-4 font-display text-xl text-paper">
          Candidate Ranking
        </h1>

        {loading ? (
          <p className="text-sm text-ink-600">
            Loading candidates...
          </p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-ink-600">
            No candidates match the current filters.
          </p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-ink-800">
                <tr>
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
                      <div className="font-medium text-paper">
                        {c.name}
                      </div>

                      <div className="text-xs text-ink-600">
                        {c.email}
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

      <NotificationToast
        notifications={notifications}
        onDismiss={dismiss}
      />
    </div>
  );
}