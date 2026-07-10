import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // increased from 10s → 30s to handle Neon cold starts
});

// Request interceptor — attach token from localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const portalToken = localStorage.getItem('studentPortalToken');
    const staffToken = localStorage.getItem('authToken');
    const token = portalToken || staffToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 without silently nuking the session
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const portalToken = localStorage.getItem('studentPortalToken');
      const staffToken = localStorage.getItem('authToken');
      const token = portalToken || staffToken;

      if (token) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('studentPortalToken');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/student-login')) {
          const redirectPath = portalToken ? '/student-login' : '/login';
          window.location.href = redirectPath;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;