import axios from 'axios';

function normalizeIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeIds);
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    if (obj._id !== undefined) {
      obj.id = String(obj._id);
      delete obj._id;
    }

    if (obj.__v !== undefined) {
      delete obj.__v;
    }

    for (const key of Object.keys(obj)) {
      obj[key] = normalizeIds(obj[key]);
    }

    return obj;
  }

  return value;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sift_token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    response.data = normalizeIds(response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sift_token');
      localStorage.removeItem('sift_user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);