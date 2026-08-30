import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic token provider function that AuthContext / Clerk registers
let tokenProvider = null;

// Token provider readiness gate — resolves when setAuthTokenProvider is called
let _resolveTokenReady = null;
let _tokenReadyPromise = new Promise((resolve) => {
  _resolveTokenReady = resolve;
});
// Safety timeout: if token provider is never set (e.g., user is not signed in),
// don't block API calls forever
setTimeout(() => {
  _resolveTokenReady();
}, 3000);

export const setAuthTokenProvider = (provider) => {
  tokenProvider = provider;
  // Unblock any requests waiting for the token provider
  if (_resolveTokenReady) {
    _resolveTokenReady();
    _resolveTokenReady = null;
  }
};

/**
 * Check if the token provider has been registered.
 * Used by components to know when it's safe to make API calls.
 */
export const waitForTokenProvider = () => _tokenReadyPromise;

// Interceptor to attach Clerk / JWT token to outgoing HTTP requests
api.interceptors.request.use(
  async (config) => {
    // Wait for token provider to be registered before sending the first request
    // This prevents 401 errors during the Clerk→AuthContext initialization window
    await _tokenReadyPromise;

    let token = null;
    if (typeof tokenProvider === 'function') {
      try {
        token = await tokenProvider(false);
      } catch (err) {
        console.warn('Failed to obtain auth token from provider:', err);
      }
    }

    // Fallback to localStorage ONLY if no token provider is registered
    if (!token && !tokenProvider) {
      token = localStorage.getItem('token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to catch 401 Unauthorized responses and auto-retry once with a fresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof tokenProvider === 'function') {
        try {
          const freshToken = await tokenProvider(true);
          if (freshToken) {
            originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            return api(originalRequest);
          }
        } catch (retryErr) {
          console.warn('Auto-retry token fetch failed:', retryErr);
        }
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
