import axios from "axios";
import { env } from "@/config/env";
import { useAuthStore } from "@/features/auth/store/auth.store";

/**
 * The one axios instance for the whole app. UI components must never import
 * this directly — only feature `api/*.api.ts` modules do (enforced by ESLint).
 */
export const apiClient = axios.create({
  baseURL: `${env.VITE_API_URL}/api/v1`,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Single-session backend: any 401 means the token is gone/replaced.
    if (error?.response?.status === 401) {
      const { isLoggedIn, logout } = useAuthStore.getState();
      if (isLoggedIn) {
        logout();
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);
