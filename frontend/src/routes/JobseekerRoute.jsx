import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useJobseekerAuth } from '../context/JobseekerAuthContext';

const JobseekerRoute = () => {
  const { isAuthenticated, loading, user } = useJobseekerAuth();

  if (loading) {
    return (
      <div class="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  const isJobseeker = isAuthenticated && user && user.role === 'jobseeker';

  return isJobseeker ? <Outlet /> : <Navigate to="/signin" replace />;
};

export default JobseekerRoute;
