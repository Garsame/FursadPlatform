import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to determine which token key to retrieve based on current window route
const getActiveToken = () => {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) {
    return localStorage.getItem('fursad_admin_token');
  } else if (path.startsWith('/provider')) {
    return localStorage.getItem('fursad_provider_token');
  } else {
    return localStorage.getItem('fursad_jobseeker_token');
  }
};

// Request interceptor to dynamically inject the active role's JWT token
api.interceptors.request.use(
  (config) => {
    const token = getActiveToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization errors cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, redirect to relevant login page based on context
    if (error.response && error.response.status === 401) {
      const path = window.location.pathname;
      if (path.startsWith('/admin') && !path.endsWith('/login')) {
        localStorage.removeItem('fursad_admin_token');
        window.location.href = '/admin/login';
      } else if (path.startsWith('/provider') && !path.endsWith('/login')) {
        localStorage.removeItem('fursad_provider_token');
        window.location.href = '/provider/login';
      } else if (path.startsWith('/dashboard')) {
        localStorage.removeItem('fursad_jobseeker_token');
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
