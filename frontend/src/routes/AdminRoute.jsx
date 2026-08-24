import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import RouteLoader from '../components/ui/RouteLoader';

const AdminRoute = () => {
  const { isAuthenticated, loading, user } = useAdminAuth();

  if (loading) return <RouteLoader />;

  const isAdmin = isAuthenticated && user && user.role === 'admin';

  return isAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default AdminRoute;
