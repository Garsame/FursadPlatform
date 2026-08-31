import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const JobseekerAuthContext = createContext(null);

export const JobseekerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fursad_jobseeker_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = async () => {
    try {
      setLoading(true);
      // Send this portal's own token rather than letting the interceptor
      // infer one from the URL — on a public route it would infer wrong.
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('fursad_jobseeker_token')}` },
      });
      if (res.data && res.data.success) {
        setUser(res.data.data);
      } else {
        logout();
      }
    } catch (err) {
      // A 401 means the token is genuinely finished. Anything else —
      // a dropped connection, the API restarting — must not sign the
      // user out; it is a transient failure, not an invalid session.
      if (err.response?.status === 401) {
        logout();
      } else {
        console.error('Could not verify the jobseeker session:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data && res.data.success) {
        const { token: userToken, ...userData } = res.data;
        localStorage.setItem('fursad_jobseeker_token', userToken);
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed';
      setError(errMsg);
      setLoading(false);
      return { 
        success: false, 
        message: errMsg,
        requiresVerification: err.response?.data?.requiresVerification || false
      };
    }
  };

  const register = async (name, email, phone, password) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.post('/auth/register', {
        name,
        email,
        phone,
        password,
        role: 'jobseeker'
      });
      
      setLoading(false);
      if (res.data && res.data.success) {
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed';
      setError(errMsg);
      setLoading(false);
      return { success: false, message: errMsg };
    }
  };

  const verifyOtp = async (email, otpCode) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.post('/auth/verify-otp', { email, otpCode });
      
      if (res.data && res.data.success) {
        const { token: userToken, ...userData } = res.data;
        localStorage.setItem('fursad_jobseeker_token', userToken);
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Verification failed';
      setError(errMsg);
      setLoading(false);
      return { success: false, message: errMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('fursad_jobseeker_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <JobseekerAuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated: !!token,
        login,
        register,
        verifyOtp,
        logout
      }}
    >
      {children}
    </JobseekerAuthContext.Provider>
  );
};

export const useJobseekerAuth = () => useContext(JobseekerAuthContext);
