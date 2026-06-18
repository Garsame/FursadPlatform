import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Users, Briefcase, FileClock, ShieldAlert, Check, X, ShieldAlert as AlertIcon } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review job action loading state
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, usersRes, jobsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users?limit=5'),
        api.get('/admin/jobs/pending')
      ]);

      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.data.summary);
      if (usersRes.data?.success) setRecentUsers(usersRes.data.data.slice(0, 5));
      if (jobsRes.data?.success) setPendingJobs(jobsRes.data.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleReviewJob = async (jobId, decision) => {
    setActionLoading(true);
    try {
      const res = await api.put(`/admin/jobs/${jobId}/review`, {
        action: decision,
        note: `Reviewed and approved/rejected by administrator.`
      });

      if (res.data?.success) {
        alert(`Job listing successfully ${decision === 'approve' ? 'approved' : 'rejected'}.`);
        fetchDashboardData(); // Reload stats & pending jobs
      }
    } catch (err) {
      alert('Review action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Row 1: Analytics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center justify-between border-l-4 border-l-brand-green">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Total Registered Users</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{analytics?.totalUsers || 0}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Users size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-l-4 border-l-brand-green">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Total Jobs Posted</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{analytics?.totalJobs || 0}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Briefcase size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Active Applications</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{analytics?.activeApplications || 0}</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
            <FileClock size={24} />
          </div>
        </Card>

        <Card className={`flex items-center justify-between border-l-4 ${analytics?.pendingReviews > 0 ? 'border-l-warning animate-pulse' : 'border-l-brand-green'}`}>
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Pending AI Reviews</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{analytics?.pendingReviews || 0}</span>
          </div>
          <div className="p-3 bg-warning/10 text-warning rounded-full">
            <ShieldAlert size={24} />
          </div>
        </Card>
      </div>

      {/* Row 2: Tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recent Users */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-text-primary">Recent Registrations</h3>
          <Card className="p-0 overflow-hidden border border-border-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-elevated border-b border-border-subtle text-text-secondary">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user._id} className="border-b border-border-subtle hover:bg-bg-elevated/40">
                      <td className="p-4 font-semibold text-text-primary">{user.name}</td>
                      <td className="p-4 text-text-secondary">{user.email}</td>
                      <td className="p-4 capitalize">
                        <Badge variant={user.role === 'admin' ? 'danger' : 'neutral'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.isActive ? 'success' : 'danger'}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Pending Job approvals review */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-text-primary">Pending Job Approvals (AI flagged)</h3>
          
          <div className="flex flex-col gap-4">
            {pendingJobs.length === 0 ? (
              <Card className="text-center py-10 text-text-secondary">
                No jobs currently pending administrative moderation.
              </Card>
            ) : (
              pendingJobs.slice(0, 3).map((job) => (
                <Card key={job._id} className="border-warning/30 bg-warning/5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-text-primary">{job.title}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">{job.company?.name || 'Recruiter'}</p>
                    </div>
                    
                    <Badge variant="danger" className="text-[10px]">
                      AI Score: {job.aiQualityScore}%
                    </Badge>
                  </div>

                  {job.aiQualityFlags && job.aiQualityFlags.length > 0 && (
                    <div className="flex items-start gap-1.5 text-xs text-danger/80 bg-danger/5 p-2 rounded">
                      <AlertIcon size={14} className="shrink-0 mt-0.5" />
                      <span><strong>AI Flags:</strong> {job.aiQualityFlags.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex justify-end items-center gap-2 border-t border-border-subtle pt-3 mt-1">
                    <Button 
                      variant="ghost" 
                      className="h-8 text-xs text-danger hover:bg-danger/10 px-3 gap-1"
                      onClick={() => handleReviewJob(job._id, 'reject')}
                      disabled={actionLoading}
                    >
                      <X size={14} /> Reject
                    </Button>
                    <Button 
                      variant="primary" 
                      className="h-8 text-xs bg-brand-green hover:bg-brand-hover text-bg-primary font-semibold px-3 gap-1"
                      onClick={() => handleReviewJob(job._id, 'approve')}
                      disabled={actionLoading}
                    >
                      <Check size={14} /> Approve & Publish
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
