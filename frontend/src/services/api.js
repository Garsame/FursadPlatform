import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/** The three portals keep separate sessions under separate keys. */
export const TOKEN_KEYS = {
  admin:     'fursad_admin_token',
  provider:  'fursad_provider_token',
  jobseeker: 'fursad_jobseeker_token',
};

/**
 * Which portal's token applies to the request being made right now.
 *
 * The path normally says which portal is in play. But several routes belong to
 * no portal at all — a public company profile, a job detail page, About.
 *
 * The previous version fell through to the jobseeker key on those routes and
 * returned null when no jobseeker was signed in. That is exactly what signed
 * employers out: opening "View public profile" moved them to /companies/:id,
 * the next /auth/me went out with no Authorization header, came back 401, and
 * the auth context read that as an invalid session and cleared their token.
 *
 * On a shared route we now fall back to whichever session actually exists,
 * rather than guessing wrong and destroying it.
 *
 * Also exported because the notification socket needs the raw value — it
 * authenticates on connect rather than through the axios interceptor.
 */
export const getPortalToken = () => {
  const path = window.location.pathname;
  const get = (k) => localStorage.getItem(k);

  if (path.startsWith('/admin'))     return get(TOKEN_KEYS.admin);
  if (path.startsWith('/provider'))  return get(TOKEN_KEYS.provider);
  if (path.startsWith('/dashboard')) return get(TOKEN_KEYS.jobseeker);

  // Public or shared route — no portal owns it, so use whoever is signed in.
  return get(TOKEN_KEYS.jobseeker) || get(TOKEN_KEYS.provider) || get(TOKEN_KEYS.admin);
};

// Request interceptor to inject the active role's JWT
api.interceptors.request.use(
  (config) => {
    // An explicit Authorization header always wins. The auth contexts set one
    // when validating their own session, so that check can never be answered
    // with a different portal's token — or with none at all.
    if (!config.headers.Authorization) {
      const token = getPortalToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }

    // File uploads must NOT carry the instance-wide JSON content type: the
    // browser has to set multipart/form-data itself so it can append the
    // boundary. Without the boundary multer sees an empty body.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
    // Only a genuine 401 from the server ends a session. A network failure has
    // no `response` at all, and clearing tokens on one would sign people out
    // over a dropped connection.
    if (error.response?.status === 401) {
      const path = window.location.pathname;

      // Redirect only from inside a portal. On a public page a 401 simply
      // means the request wanted a session and there isn't one — normal for an
      // anonymous visitor, and no reason to touch anyone's stored token.
      if (path.startsWith('/admin') && !path.endsWith('/login')) {
        localStorage.removeItem(TOKEN_KEYS.admin);
        window.location.href = '/admin/login';
      } else if (path.startsWith('/provider') && !path.endsWith('/login')) {
        localStorage.removeItem(TOKEN_KEYS.provider);
        window.location.href = '/provider/login';
      } else if (path.startsWith('/dashboard')) {
        localStorage.removeItem(TOKEN_KEYS.jobseeker);
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
