interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

/** Simple analytics tile for the recruiter dashboard header. */
export default function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-600">{label}</p>
      <p className="mt-1 font-display text-2xl text-paper">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-600">{hint}</p>}
    </div>
  );
}
