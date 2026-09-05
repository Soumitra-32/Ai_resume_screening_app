import { create } from 'zustand';
import { authApi, type LoginPayload, type SignupPayload } from '@/services/authApi';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

function persistSession(user: User, token: string) {
  localStorage.setItem('sift_token', token);
  localStorage.setItem('sift_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('sift_token');
  localStorage.removeItem('sift_user');
}

function readStoredUser(): User | null {
  const raw = localStorage.getItem('sift_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    // 7.13 — corrupted localStorage value; treat as logged out rather than crashing
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  error: null,

  hydrate: async () => {
    const storedUser = readStoredUser();
    const token = localStorage.getItem('sift_token');

    if (!storedUser || !token) {
      clearSession();
      set({ user: null, isInitializing: false });
      return;
    }

    // 7.14 — don't trust localStorage alone; verify the session against
    // the server so a revoked/expired token or a since-deleted/role-changed
    // user doesn't silently keep the app in a stale authenticated state.
    try {
      const freshUser = await authApi.me();
      set({ user: freshUser, isInitializing: false });
    } catch {
      clearSession();
      set({ user: null, isInitializing: false });
    }
  },

  login: async (payload) => {
    set({ error: null });
    try {
      const { user, token } = await authApi.login(payload);
      persistSession(user, token);
      set({ user });
      return user;
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not sign in. Check your email and password.');
      set({ error: message });
      throw new Error(message);
    }
  },

  signup: async (payload) => {
    set({ error: null });
    try {
      const { user, token } = await authApi.signup(payload);
      persistSession(user, token);
      set({ user });
      return user;
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not create your account.');
      set({ error: message });
      throw new Error(message);
    }
  },

  logout: () => {
    clearSession();
    set({ user: null });
  },
}));

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: string; message?: string } } }).response;
    // 7.15 — backend returns { error: "..." }, not { message: "..." }
    if (response?.data?.error) return response.data.error;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}