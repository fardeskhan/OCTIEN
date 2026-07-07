import axios from 'axios';

/**
 * Universal Axios instance configuring default headers, baseUrl, and JWT interceptors.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Hook in JWT resolution from Zustand store or Next-Auth here later
api.interceptors.request.use((config) => {
  // const token = useAuthStore.getState().token;
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Standard context headers injected globally
  config.headers['x-correlation-id'] = crypto.randomUUID();
  return config;
});
