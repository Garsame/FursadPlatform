import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Briefcase, FileText, CheckCircle, GraduationCap, MapPin, Sparkles, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [profileRes, recsRes, appsRes] = await Promise.all([
          api.get('/profile/me'),
          api.get('/profile/recommendations'),
          api.get('/applications/mine')
        ]);

        if (profileRes.data?.success) setProfile(profileRes.data.data);
        if (recsRes.data?.success) setRecommendations(recsRes.data.data.slice(0, 5));
        if (appsRes.data?.success) setApplications(appsRes.data.data);
      } catch (error) {
        console.error('Error loading jobseeker dashboard data:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  // Calculate metrics
  const totalApplied = applications.length;
  const totalShortlisted = applications.filter(a => a.status === 'shortlisted').length;
  const totalInterviews = applications.filter(a => a.status === 'interview').length;
  const completeness = profile?.profileCompletenessScore || 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {t('dashboard.welcome')} {profile?.user?.name || 'User'}
        </h1>
        <p className="text-text-secondary text-sm">Here is what's happening with your job applications today.</p>
      </div>

      {/* Row 1: Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">{t('dashboard.jobs_applied')}</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{totalApplied}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <FileText size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">{t('dashboard.shortlisted')}</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{totalShortlisted}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <CheckCircle size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">{t('nav.applications')}</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{totalInterviews}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Briefcase size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">{t('dashboard.profile_complete')}</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{completeness}%</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <GraduationCap size={24} />
          </div>
        </Card>
      </div>

      {/* Row 2: Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recommended Jobs (Left Col, 2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Sparkles size={18} className="text-brand-green" />
              {t('dashboard.recommended_jobs')}
            </h3>
            <Link to="/dashboard/jobs" className="text-xs text-brand-green hover:underline flex items-center gap-1 font-semibold">
              Browse All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {recommendations.length === 0 ? (
              <Card className="p-8 text-center text-text-secondary">
                No recommended jobs found. Complete your profile skills to get matched.
              </Card>
            ) : (
              recommendations.map(({ job, score }) => (
                <Card 
                  key={job._id} 
                  hoverEffect 
                  onClick={() => navigate(`/dashboard/jobs?id=${job._id}`)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-bold text-text-primary text-base">{job.title}</h4>
                    <p className="text-sm text-text-secondary">{job.company?.name || 'Company'}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-text-muted mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {job.location?.city}, {job.location?.country}
                      </span>
                      <span>•</span>
                      <span>{job.employmentType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-text-muted">Match Score</span>
                      <span className="text-lg font-extrabold text-brand-green">{score}%</span>
                    </div>
                    <Button variant="ghost" className="px-3 py-1">View</Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Application Status tracker (Right Col, 1/3 width) */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-text-primary">{t('dashboard.recent_activity')}</h3>

          <div className="bg-bg-surface border border-border-subtle rounded-card p-6 flex flex-col gap-6">
            {applications.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6">You haven't applied to any jobs yet.</p>
            ) : (
              applications.slice(0, 5).map((app) => (
                <div key={app._id} className="flex flex-col gap-2 border-b border-border-subtle last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-sm truncate max-w-[150px] text-text-primary">{app.job?.title}</h5>
                    <Badge variant={app.status === 'rejected' ? 'danger' : app.status === 'hired' ? 'success' : 'info'}>
                      {app.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs text-text-secondary">
                    <span>{app.job?.company?.name}</span>
                    <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
