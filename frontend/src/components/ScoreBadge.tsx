interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

// Restyled to the app's palette. The score thresholds map to signal (strong),
// flag (moderate) and ink-600 (weak) so badges sit naturally on the dark UI.
function tier(score: number): string {
  if (score >= 80) return 'border-signal/50 bg-signal/10 text-signal';
  if (score >= 60) return 'border-signal/30 bg-signal/5 text-signal-dim';
  if (score >= 40) return 'border-flag/50 bg-flag/10 text-flag';
  return 'border-line bg-ink-800 text-ink-600';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-line bg-ink-800 font-semibold text-ink-600 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        }`}
      >
        Not scored
      </span>
    );
  }

  const pct = Math.round(score * 100);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${sizeClasses} ${tier(pct)}`}>
      {pct}% Match
    </span>
  );
}
