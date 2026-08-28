import { Candidate } from '../types/candidate';

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

export default function ResumePreviewModal({ candidate, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="font-semibold text-lg">{candidate.name}</h2>
            <p className="text-sm text-gray-500">{candidate.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl">
            &times;
          </button>
        </div>

        <div className="p-4 flex flex-wrap gap-2 border-b">
          {candidate.skills.map((skill) => (
            <span
              key={skill.name}
              className={`text-xs px-2 py-1 rounded-full ${
                skill.matched
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {skill.name}
            </span>
          ))}
        </div>

        <div className="p-4 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
          {highlightSkills(candidate.resumeText, candidate.skills)}
        </div>

        <div className="p-4 border-t flex justify-between items-center">

            href={candidate.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 text-sm hover:underline"
          >
            Download Original Resume
          </a>
          <ScoreBadgeInline score={candidate.matchScore} />
        </div>
      </div>
    </div>
  );
}

function ScoreBadgeInline({ score }: { score: number }) {
  return <span className="text-sm font-semibold text-gray-700">{Math.round(score * 100)}% match</span>;
}