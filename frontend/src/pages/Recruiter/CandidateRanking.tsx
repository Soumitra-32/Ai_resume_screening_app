import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Candidate, RankingFilters, SortField, SortOrder } from '../../types/candidate';
import { candidateApi } from '../../services/candidateApi';
import ScoreBadge from '../../components/ScoreBadge';
import RankingFiltersPanel from '../../components/RankingFiltersPanel';
import ResumePreviewModal from '../../components/ResumePreviewModal';
import NotificationToast from '../../components/NotificationToast';
import { useNotifications } from '../../hooks/useNotifications';

export default function CandidateRanking() {
  const { jobId } = useParams<{ jobId: string }>();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);
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
    candidateApi.getAvailableSkills(jobId).then(setAvailableSkills).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    candidateApi
      .getRankedCandidates(jobId, filters, sortField, sortOrder)
      .then(setCandidates)
      .catch(() => notify('Failed to load candidates', 'error'))
      .finally(() => setLoading(false));
  }, [jobId, filters, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleStatusChange = async (applicationId: string, status: string) => {
    try {
      await candidateApi.updateStatus(applicationId, status);
      setCandidates((prev) =>
        prev.map((c) => (c.applicationId === applicationId ? { ...c, status: status as any } : c))
      );
      notify(`Candidate marked as ${status}`, 'success');
    } catch {
      notify('Failed to update status', 'error');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer select-none hover:bg-gray-100"
    >
      {label} {sortField === field ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
      <div className="md:col-span-1">
        <RankingFiltersPanel availableSkills={availableSkills} onChange={setFilters} />
      </div>

      <div className="md:col-span-3">
        <h1 className="text-xl font-bold mb-4">Candidate Ranking</h1>

        {loading ? (
          <p className="text-gray-500">Loading candidates...</p>
        ) : candidates.length === 0 ? (
          <p className="text-gray-500">No candidates match the current filters.</p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader field="name" label="Candidate" />
                  <SortHeader field="matchScore" label="Score" />
                  <SortHeader field="experienceYears" label="Experience" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Skills</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.map((c) => (
                  <tr key={c.applicationId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={c.matchScore} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.experienceYears} yrs</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.skills
                          .filter((s) => s.matched)
                          .slice(0, 4)
                          .map((s) => (
                            <span key={s.name} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              {s.name}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.applicationId, e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPreviewCandidate(c)}
                        className="text-blue-600 text-sm hover:underline"
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
        <ResumePreviewModal candidate={previewCandidate} onClose={() => setPreviewCandidate(null)} />
      )}

      <NotificationToast notifications={notifications} onDismiss={dismiss} />
    </div>
  );
}