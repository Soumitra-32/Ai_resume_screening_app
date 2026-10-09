import { useEffect } from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

// Restyled with the app's design tokens (ink/signal/flag) instead of stock
// Tailwind colors, so toasts match the dark theme.
const styles: Record<Notification['type'], { wrap: string; icon: string }> = {
  success: {
    wrap: 'border-signal/50 bg-signal/10 text-signal',
    icon: '✓',
  },
  error: {
    wrap: 'border-flag/60 bg-flag/10 text-flag',
    icon: '!',
  },
  info: {
    wrap: 'border-line bg-ink-800 text-paper',
    icon: 'i',
  },
};

export default function NotificationToast({ notifications, onDismiss }: Props) {
  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 4000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const s = styles[notification.type];

  return (
    <div
      role="status"
      className={`flex min-w-[260px] items-center justify-between gap-3 rounded-sm border px-4 py-3 shadow-lg animate-fade-in ${s.wrap}`}
    >
      <span className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs" aria-hidden="true">
          {s.icon}
        </span>
        {notification.message}
      </span>
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-current/70 hover:text-current"
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  );
}
