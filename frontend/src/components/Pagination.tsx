interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/** Compact prev/next pager with a "showing X–Y of Z" summary. */
export default function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-ink-600">
        Showing <span className="font-mono text-paper">{from}</span>–
        <span className="font-mono text-paper">{to}</span> of{' '}
        <span className="font-mono text-paper">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary px-3 py-1 text-xs"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
        >
          ← Prev
        </button>
        <span className="font-mono text-xs text-ink-600">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          className="btn-secondary px-3 py-1 text-xs"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
