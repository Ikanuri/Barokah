import axios from 'axios';

// Resolve API base URL at request time (not module load time),
// so SSR caching never locks the URL to localhost.
const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;
    }
  }
  return 'http://localhost:8000/api';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Add auth token + resolve baseURL dynamically per request
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiUrl();
    const token = localStorage.getItem('token');
    if (token && config.headers.Authorization !== '') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log network errors or aborted requests (from timeout)
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Only redirect if we're not already on login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
