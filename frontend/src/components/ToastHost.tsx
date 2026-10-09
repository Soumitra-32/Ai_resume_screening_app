import { useToastStore } from '@/store/toastStore';
import NotificationToast from './NotificationToast';

/** Single global toast renderer; mount once near the app root. */
export default function ToastHost() {
  const { notifications, dismiss } = useToastStore();
  return <NotificationToast notifications={notifications} onDismiss={dismiss} />;
}
