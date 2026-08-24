import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useProviderAuth } from '../context/ProviderAuthContext';
import RouteLoader from '../components/ui/RouteLoader';

const ProviderRoute = () => {
  const { isAuthenticated, loading, user } = useProviderAuth();

  if (loading) return <RouteLoader />;

  const isProvider = isAuthenticated && user && user.role === 'employer';

  return isProvider ? <Outlet /> : <Navigate to="/provider/login" replace />;
};

export default ProviderRoute;
