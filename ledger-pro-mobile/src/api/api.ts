import axios from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';

// eslint-disable-next-line import/no-named-as-default-member
const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Automatic logout on 401
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
