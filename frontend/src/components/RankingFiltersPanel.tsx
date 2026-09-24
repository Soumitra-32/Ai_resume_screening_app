import { useState, useEffect } from 'react';
import { RankingFilters } from '../types/candidate';

interface Props {
  availableSkills: string[];
  onChange: (filters: RankingFilters) => void;
}

const DEFAULT_FILTERS: RankingFilters = {
  minScore: 0,
  minExperience: 0,
  skills: [],
  status: '',
  search: '',
};

export default function RankingFiltersPanel({
  availableSkills,
  onChange,
}: Props) {
  const [filters, setFilters] = useState<RankingFilters>(
    DEFAULT_FILTERS
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      onChange(filters);
    }, 300);

    return () => {
      clearTimeout(debounce);
    };
  }, [filters, onChange]);

  const toggleSkill = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-paper">
          Filters
        </h3>

        <button
          type="button"
          onClick={reset}
          className="text-sm text-signal hover:underline"
        >
          Reset
        </button>
      </div>

      <input
        type="text"
        placeholder="Search candidate name/email..."
        value={filters.search}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            search: e.target.value,
          }))
        }
        className="field-input"
      />

      <div>
        <label className="field-label flex justify-between">
          <span>Min Match Score</span>
          <span className="font-mono">{Math.round(filters.minScore * 100)}%</span>
        </label>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.minScore}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minScore: parseFloat(e.target.value),
            }))
          }
          className="w-full accent-signal"
        />
      </div>

      <div>
        <label
          htmlFor="min-experience"
          className="field-label"
        >
          Min Experience (years)
        </label>

        <input
          id="min-experience"
          type="number"
          min={0}
          value={filters.minExperience}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minExperience: Number(e.target.value),
            }))
          }
          className="field-input"
        />
      </div>

      <div>
        <label
          htmlFor="candidate-status"
          className="field-label"
        >
          Status
        </label>

        <select
          id="candidate-status"
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: e.target.value,
            }))
          }
          className="field-input"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="scored">Scored</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      <div>
        <label className="field-label mb-1 block">
          Required Skills
        </label>

        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {availableSkills.map((skill) => (
            <button
              type="button"
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`rounded-sm border px-2 py-1 font-mono text-[11px] transition ${
                filters.skills.includes(skill)
                  ? 'border-signal bg-signal/15 text-signal'
                  : 'border-line text-ink-600 hover:text-paper'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}