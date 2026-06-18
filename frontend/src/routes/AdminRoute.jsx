import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminRoute = () => {
  const { isAuthenticated, loading, user } = useAdminAuth();

  if (loading) {
    return (
      <div class="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  const isAdmin = isAuthenticated && user && user.role === 'admin';

  return isAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default AdminRoute;
