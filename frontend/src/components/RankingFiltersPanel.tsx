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

export default function RankingFiltersPanel({ availableSkills, onChange }: Props) {
  const [filters, setFilters] = useState<RankingFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const debounce = setTimeout(() => onChange(filters), 300);
    return () => clearTimeout(debounce);
  }, [filters]);

  const toggleSkill = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const reset = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Filters</h3>
        <button onClick={reset} className="text-sm text-blue-600 hover:underline">
          Reset
        </button>
      </div>

      <input
        type="text"
        placeholder="Search candidate name/email..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        className="w-full border rounded px-3 py-2 text-sm"
      />

      <div>
        <label className="text-sm text-gray-600 flex justify-between">
          Min Match Score <span>{Math.round(filters.minScore * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.minScore}
          onChange={(e) => setFilters({ ...filters, minScore: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-gray-600">Min Experience (years)</label>
        <input
          type="number"
          min={0}
          value={filters.minExperience}
          onChange={(e) => setFilters({ ...filters, minExperience: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2 text-sm mt-1"
        />
      </div>

      <div>
        <label className="text-sm text-gray-600">Status</label>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm mt-1"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-gray-600 mb-1 block">Required Skills</label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {availableSkills.map((skill) => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`text-xs px-2 py-1 rounded-full border ${
                filters.skills.includes(skill)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
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