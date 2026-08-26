import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, error, login, signup, logout } = useAuthStore();
  return {
    user,
    isAuthenticated: Boolean(user),
    error,
    login,
    signup,
    logout,
  };
}