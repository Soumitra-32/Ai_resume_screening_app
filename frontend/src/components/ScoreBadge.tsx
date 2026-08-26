interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

function tierFor(score: number): { label: string; ring: string; text: string } {
  if (score >= 80) return { label: 'strong match', ring: 'border-signal', text: 'text-signal' };
  if (score >= 55) return { label: 'possible match', ring: 'border-flag', text: 'text-flag' };
  return { label: 'weak match', ring: 'border-ink-600', text: 'text-ink-600' };
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-sm border border-line px-2 py-1 font-mono text-xs text-ink-600">
        scoring…
      </span>
    );
  }

  const tier = tierFor(score);
  const dimension = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm';

  return (
    <div className="inline-flex items-center gap-2" title={tier.label}>
      <div
        className={`flex ${dimension} items-center justify-center rounded-full border-2 ${tier.ring} font-mono font-medium ${tier.text}`}
      >
        {Math.round(score)}
      </div>
      <span className={`hidden text-xs uppercase tracking-wide sm:inline ${tier.text}`}>{tier.label}</span>
    </div>
  );
}