import axios from "axios";

// Security: Tokens are now in HTTPOnly cookies, not localStorage
// This interceptor no longer manages tokens directly

const axiosInterceptorInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://site--mzbs--lvqlqxbx7xgh.code.run/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,  // Security: Include HTTPOnly cookies in requests
});

// Token refresh queue — ensures only ONE refresh happens at a time
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Request interceptor
axiosInterceptorInstance.interceptors.request.use(
  (config) => {
    // No need to manually add token - it's in the HTTPOnly cookie
    // and sent automatically via withCredentials
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 and refresh token
axiosInterceptorInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only retry if it's a 401 (Unauthorized) and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If a refresh is already in progress, wait for it instead of starting a new one
      if (isRefreshing && refreshPromise) {
        try {
          await refreshPromise;
          // After refresh completes, retry original request with fresh cookie
          return axiosInterceptorInstance(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      // Start the refresh process
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          console.log("Interceptor - 401 detected, attempting token refresh...");
          
          // Refresh token endpoint - tokens in cookies
          const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const refreshResponse = await axios.post(
            `${baseURL}/auth/refresh`,
            {},
            { 
              withCredentials: true,  // Critical: Include/send cookies
              headers: {
                "Content-Type": "application/json",
              }
            }
          );

          console.log("Interceptor - Token refreshed successfully", {
            statusCode: refreshResponse.status,
            hasCookie: !!refreshResponse.headers['set-cookie']
          });
          
          // Wait a tiny moment for browser to process the Set-Cookie header
          // This ensures the new token is in the cookie jar before retry
          await new Promise(resolve => setTimeout(resolve, 10));
          
        } catch (refreshError) {
          // Refresh failed - clear authentication and redirect to login
          console.error("Interceptor - Token refresh failed:", refreshError);
          
          // Clear sessionStorage on refresh failure
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("userRole");
          
          // Redirect to login page
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw refreshError;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        await refreshPromise;
        // After refresh completes and cookies are set, retry original request
        // The browser will automatically include the new token in the cookie
        return axiosInterceptorInstance(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    // For non-401 errors or if retry already attempted, just reject
    if (error.response) {
      console.error(`API Error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error("API Error: No response from server", error.request);
    } else {
      console.error("API Error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInterceptorInstance;

