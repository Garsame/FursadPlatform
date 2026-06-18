import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fursad_admin_token') || null);
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
      console.error('Failed to load admin:', err.message);
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
        localStorage.setItem('fursad_admin_token', userToken);
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed';
      setError(errMsg);
      setLoading(false);
      return { success: false, message: errMsg };
    }
  };

  const register = async (name, email, password, adminSecret) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        role: 'admin',
        adminSecret
      });
      
      if (res.data && res.data.success) {
        const { token: userToken, ...userData } = res.data;
        localStorage.setItem('fursad_admin_token', userToken);
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed';
      setError(errMsg);
      setLoading(false);
      return { success: false, message: errMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('fursad_admin_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated: !!token,
        login,
        register,
        logout
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
