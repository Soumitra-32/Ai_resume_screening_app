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
  hydrate: () => void;
}

function persistSession(user: User, token: string) {
  localStorage.setItem('sift_token', token);
  localStorage.setItem('sift_user', JSON.stringify(user));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  error: null,

  hydrate: () => {
    const raw = localStorage.getItem('sift_user');
    const token = localStorage.getItem('sift_token');
    set({ user: raw && token ? (JSON.parse(raw) as User) : null, isInitializing: false });
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
    localStorage.removeItem('sift_token');
    localStorage.removeItem('sift_user');
    set({ user: null });
  },
}));

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}