import { useEffect, useState } from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
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
  }, [notification.id]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  return (
    <div className={`${colors[notification.type]} text-white px-4 py-3 rounded-lg shadow-lg min-w-[260px] flex justify-between items-center animate-fade-in`}>
      <span className="text-sm">{notification.message}</span>
      <button onClick={() => onDismiss(notification.id)} className="ml-3 text-white/80 hover:text-white">
        &times;
      </button>
    </div>
  );
}