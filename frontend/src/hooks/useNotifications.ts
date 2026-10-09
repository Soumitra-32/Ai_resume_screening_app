import { useToastStore } from '@/store/toastStore';

/**
 * Thin wrapper around the global toast store so existing call sites keep the
 * same shape. Notifications are now shared app-wide instead of per-page.
 */
export function useNotifications() {
  return useToastStore();
}
