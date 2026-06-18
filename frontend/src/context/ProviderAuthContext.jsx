import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const ProviderAuthContext = createContext(null);

export const ProviderAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fursad_provider_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data && res.data.success) {
        setUser(res.data.data);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to load provider:', err.message);
      logout();
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
        localStorage.setItem('fursad_provider_token', userToken);
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

  const register = async (name, companyName, email, phone, password) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.post('/auth/register', {
        name,
        email,
        phone,
        password,
        role: 'employer',
        companyName // sent for background processing to associate later
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
        localStorage.setItem('fursad_provider_token', userToken);
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
    localStorage.removeItem('fursad_provider_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <ProviderAuthContext.Provider
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
    </ProviderAuthContext.Provider>
  );
};

export const useProviderAuth = () => useContext(ProviderAuthContext);
