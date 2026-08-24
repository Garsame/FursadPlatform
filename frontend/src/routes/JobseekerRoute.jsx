import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useJobseekerAuth } from '../context/JobseekerAuthContext';
import RouteLoader from '../components/ui/RouteLoader';

const JobseekerRoute = () => {
  const { isAuthenticated, loading, user } = useJobseekerAuth();

  if (loading) return <RouteLoader />;

  const isJobseeker = isAuthenticated && user && user.role === 'jobseeker';

  return isJobseeker ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default JobseekerRoute;
