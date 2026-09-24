import { Candidate } from '../types/candidate';
import { apiClient } from '../services/apiClient';
import ScoreBadge from './ScoreBadge';

interface Props {
  candidate: Candidate;
  onClose: () => void;
}

function highlightSkills(text: string, skills: { name: string; matched: boolean }[]) {
  const matchedSkills = skills.filter((s) => s.matched).map((s) => s.name);
  if (matchedSkills.length === 0) return text;

  const pattern = new RegExp(`\\b(${matchedSkills.map(escapeRegex).join('|')})\\b`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    matchedSkills.some((s) => s.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function handleDownload(resumeUrl: string) {
  const res = await apiClient.get(resumeUrl, { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume';
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function ResumePreviewModal({ candidate, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card flex max-h-[85vh] w-full max-w-2xl flex-col shadow-xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h2 className="font-display text-lg text-paper">{candidate.name}</h2>
            <p className="text-sm text-ink-600">{candidate.email}</p>
          </div>
          <button onClick={onClose} className="text-xl text-ink-600 hover:text-paper">
            &times;
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          {candidate.skills.map((skill) => (
            <span
              key={skill.name}
              className={`rounded-sm border px-2 py-1 font-mono text-[11px] ${
                skill.matched
                  ? 'border-signal/40 bg-signal/10 text-signal'
                  : 'border-line text-ink-600'
              }`}
            >
              {skill.name}
            </span>
          ))}
        </div>

        <div className="overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-paper/80">
          {highlightSkills(candidate.resumeText, candidate.skills)}
        </div>

        <div className="flex items-center justify-between border-t border-line p-4">
          <button
            onClick={() => handleDownload(candidate.resumeUrl)}
            className="text-sm text-signal hover:underline"
          >
            Download Original Resume
          </button>
          <ScoreBadge score={candidate.matchScore} size="sm" />
        </div>
      </div>
    </div>
  );
}