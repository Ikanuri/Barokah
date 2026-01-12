import axios from 'axios';

// Get API URL from environment variable or fallback to auto-detect
const getApiUrl = () => {
  // Use environment variable if available (from .env.local)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback: Auto-detect API URL based on environment
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // If accessing from network IP (not localhost), use same IP for backend
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;  // Changed from 8080 to 8000
    }
  }
  // Default to localhost:8000 for development
  return 'http://localhost:8000/api';  // Changed from 8080 to 8000
};

// Development: Use HTTP directly (no HTTPS complexity)
const api = axios.create({
  baseURL: getApiUrl(),  // Auto-detect based on env var or hostname
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Disable for same-origin HTTP
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    const token = localStorage.getItem('token');
    if (token && config.headers.Authorization !== '') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Don't log network errors or aborted requests (from timeout)
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CANCELED') {
      console.warn('📥 Network Error:', error.code, error.message);
      // Silent fail for network checks
      return Promise.reject(error);
    }
    
    console.error('📥 API Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Only redirect if we're not already on login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        console.warn('Unauthorized - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
