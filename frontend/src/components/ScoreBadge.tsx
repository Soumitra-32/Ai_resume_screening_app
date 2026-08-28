interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const pct = Math.round(score * 100);

  const getColor = () => {
    if (pct >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (pct >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (pct >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getColor()}`}>
      {pct}% Match
    </span>
  );
}