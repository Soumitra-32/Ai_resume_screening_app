/** Skeleton loading placeholders to replace bare "Loading…" text. */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="card flex items-center justify-between p-5">
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-48" />
        <div className="flex gap-1">
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-4 w-12" />
        </div>
      </div>
      <SkeletonBlock className="h-8 w-10" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTableRows({ count = 5 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
