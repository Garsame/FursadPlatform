import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { JobseekerAuthProvider } from './context/JobseekerAuthContext';
import { ProviderAuthProvider } from './context/ProviderAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

// Route Guards
import JobseekerRoute from './routes/JobseekerRoute';
import ProviderRoute from './routes/ProviderRoute';
import AdminRoute from './routes/AdminRoute';

// Layout wrappers
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import SignIn from './pages/public/SignIn';
import SignUp from './pages/public/SignUp';
import Verify from './pages/public/Verify';

// Jobseeker Pages
import JobseekerDashboard from './pages/jobseeker/Dashboard';
import JobseekerJobs from './pages/jobseeker/Jobs';
import JobseekerApplications from './pages/jobseeker/Applications';
import JobseekerProfile from './pages/jobseeker/Profile';

// Provider Pages
import ProviderLogin from './pages/provider/Login';
import ProviderSignup from './pages/provider/Signup';
import ProviderDashboard from './pages/provider/Dashboard';
import ProviderPostJob from './pages/provider/PostJob';
import ProviderMyJobs from './pages/provider/MyJobs';
import ProviderApplicants from './pages/provider/Applicants';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminSignup from './pages/admin/Signup';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminJobs from './pages/admin/Jobs';
import AdminAnalytics from './pages/admin/Analytics';
import AdminAuditLog from './pages/admin/AuditLog';

// Load translation configuration
import './i18n/i18n';

function App() {
  return (
    <Router>
      <JobseekerAuthProvider>
        <ProviderAuthProvider>
          <AdminAuthProvider>
            <Routes>
              
              {/* 1. PUBLIC ROUTES */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/verify" element={<Verify />} />
              </Route>

              {/* 2. JOBSEEKER PROTECTED DASHBOARD ROUTES */}
              <Route element={<JobseekerRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<JobseekerDashboard />} />
                  <Route path="/dashboard/jobs" element={<JobseekerJobs />} />
                  <Route path="/dashboard/applications" element={<JobseekerApplications />} />
                  <Route path="/dashboard/profile" element={<JobseekerProfile />} />
                </Route>
              </Route>

              {/* 3. PROVIDER ROUTING & PORTAL */}
              {/* Provider Entry point redirects */}
              <Route path="/provider" element={<Navigate to="/provider/login" replace />} />
              <Route path="/provider/login" element={<ProviderLogin />} />
              <Route path="/provider/signup" element={<ProviderSignup />} />
              
              <Route element={<ProviderRoute />}>
                <Route element={<ProviderLayout />}>
                  <Route path="/provider/dashboard" element={<ProviderDashboard />} />
                  <Route path="/provider/jobs/new" element={<ProviderPostJob />} />
                  <Route path="/provider/jobs" element={<ProviderMyJobs />} />
                  <Route path="/provider/jobs/:id/applicants" element={<ProviderApplicants />} />
                </Route>
              </Route>

              {/* 4. ADMIN ROUTING & PORTAL */}
              {/* Admin Entry point redirects */}
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/signup" element={<AdminSignup />} />

              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/jobs" element={<AdminJobs />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/audit" element={<AdminAuditLog />} />
                </Route>
              </Route>

              {/* 5. FALLBACK REDIRECT */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </AdminAuthProvider>
        </ProviderAuthProvider>
      </JobseekerAuthProvider>
    </Router>
  );
}

export default App;
