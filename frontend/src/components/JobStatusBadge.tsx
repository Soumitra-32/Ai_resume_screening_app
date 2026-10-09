import type { Job } from '@/types';

const STATUS_STYLES: Record<Job['status'], string> = {
  draft: 'border-line bg-ink-800 text-ink-600',
  open: 'border-signal/50 bg-signal/10 text-signal',
  closed: 'border-flag/50 bg-flag/10 text-flag',
  archived: 'border-line bg-ink-900 text-ink-600',
};

export default function JobStatusBadge({ status }: { status: Job['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
