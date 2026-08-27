import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic token provider function that AuthContext / Clerk registers
let tokenProvider = null;

export const setAuthTokenProvider = (provider) => {
  tokenProvider = provider;
};

// Interceptor to attach Clerk / JWT token to outgoing HTTP requests
api.interceptors.request.use(
  async (config) => {
    let token = null;
    if (typeof tokenProvider === 'function') {
      try {
        token = await tokenProvider();
      } catch (err) {
        console.warn('Failed to obtain auth token from provider:', err);
      }
    }

    // Fallback to localStorage if no token was returned from provider
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to catch 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

