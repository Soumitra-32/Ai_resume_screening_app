import { create } from 'zustand';
import type { Notification } from '@/components/NotificationToast';

interface ToastState {
  notifications: Notification[];
  notify: (message: string, type?: Notification['type']) => void;
  dismiss: (id: string) => void;
}

/**
 * Global toast store. Previously each page owned its own notifications array,
 * which meant only CandidateRanking could surface feedback. Mounting a single
 * <ToastHost /> and reading from here lets any page call useNotifications().
 */
export const useToastStore = create<ToastState>((set) => ({
  notifications: [],
  notify: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ notifications: [...s.notifications, { id, message, type }] }));
  },
  dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
