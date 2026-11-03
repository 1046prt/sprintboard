import axios from 'axios';

export const TOKEN_KEY = 'sprintboard_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthForm) {
      window.dispatchEvent(new Event('sprintboard:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ERR_CANCELED') return '';
  if (!error?.response) return 'Cannot reach the server. Check your connection and try again.';
  const { message, details } = error.response.data || {};
  if (Array.isArray(details) && details.length) return details.map((d) => d.message).join('. ');
  return message || fallback;
}

export default api;
