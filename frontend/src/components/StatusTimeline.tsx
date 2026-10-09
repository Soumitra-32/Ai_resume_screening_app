import type { ApplicationStatus } from '@/types';

const STEPS: { key: ApplicationStatus; label: string }[] = [
  { key: 'pending', label: 'Applied' },
  { key: 'scored', label: 'Scored' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
];

const ORDER: Record<string, number> = {
  pending: 0,
  scored: 1,
  shortlisted: 2,
  hired: 3,
};

/** Visual progress stepper for an application's status. Terminal states
 *  (rejected / failed) are shown as a labeled pill instead of a stepper. */
export default function StatusTimeline({ status }: { status: ApplicationStatus }) {
  if (status === 'rejected' || status === 'failed') {
    const label = status === 'rejected' ? 'Not moving forward' : 'Scoring failed';
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-flag/50 bg-flag/10 px-2 py-0.5 text-[11px] font-medium text-flag">
        {label}
      </span>
    );
  }

  const currentIndex = ORDER[status] ?? 0;

  return (
    <ol className="flex items-center gap-1" aria-label="Application progress">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-1">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                done || active
                  ? 'border-signal bg-signal/15 text-signal'
                  : 'border-line text-ink-600'
              }`}
              aria-current={active ? 'step' : undefined}
              title={step.label}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-[11px] ${active ? 'text-paper' : 'text-ink-600'}`}>{step.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-3 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
