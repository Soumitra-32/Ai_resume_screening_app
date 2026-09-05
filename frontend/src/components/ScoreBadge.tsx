interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border bg-gray-100 text-gray-500 border-gray-300">
        Not scored
      </span>
    );
  }

  const pct = Math.round(score * 100);

  const getColor = () => {
    if (pct >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (pct >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (pct >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold border ${sizeClasses} ${getColor()}`}>
      {pct}% Match
    </span>
  );
}