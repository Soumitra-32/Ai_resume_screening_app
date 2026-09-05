import ScoreBadge from './ScoreBadge';
import type { Application, ApplicationStatus } from '@/types';


interface CandidateCardProps {
  application: Application;
  onStatusChange: (status: ApplicationStatus) => void;
}

const STATUS_OPTIONS: ApplicationStatus[] = ['pending', 'scored', 'shortlisted', 'rejected', 'hired'];
export default function CandidateCard({ application, onStatusChange }: CandidateCardProps) {
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <ScoreBadge score={application.matchScore} />
        <div>
          <p className="font-display text-base text-paper">
            {application.candidateName ?? 'Unnamed candidate'}
          </p>
          <p className="text-xs text-ink-600">{application.candidateEmail}</p>
          {application.extractedSkills && application.extractedSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {application.extractedSkills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-sm border border-line px-2 py-0.5 font-mono text-[11px] text-ink-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {application.extractedExperience !== undefined && (
          <span className="font-mono text-xs text-ink-600">
            {application.extractedExperience}y exp
          </span>
        )}
        <select
          value={application.status}
          onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
          className="field-input w-auto py-1.5 text-xs capitalize"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status} className="capitalize">
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}