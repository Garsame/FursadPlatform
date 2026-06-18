import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Briefcase, Users, Calendar, Award, Plus, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplicants: 0,
    interviews: 0,
    offers: 0
  });
  const [recentApplicants, setRecentApplicants] = useState([]);

  useEffect(() => {
    const fetchEmployerDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/jobs/company/mine');
        if (res.data?.success) {
          const myJobs = res.data.data;
          setJobs(myJobs);
          
          const active = myJobs.filter(j => j.status === 'published').length;
          
          // Fetch applicants for all jobs
          let allApplicants = [];
          let interviewsCount = 0;
          let offersCount = 0;

          await Promise.all(
            myJobs.map(async (job) => {
              try {
                const appRes = await api.get(`/applications/job/${job._id}`);
                if (appRes.data?.success) {
                  const apps = appRes.data.data;
                  allApplicants = [...allApplicants, ...apps.map(a => ({ ...a, jobTitle: job.title }))];
                  interviewsCount += apps.filter(a => a.status === 'interview').length;
                  offersCount += apps.filter(a => a.status === 'offer' || a.status === 'hired').length;
                }
              } catch (e) {
                console.error(`Error loading applicants for job ${job._id}:`, e.message);
              }
            })
          );

          // Sort applicants by date
          allApplicants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRecentApplicants(allApplicants.slice(0, 5));

          setStats({
            activeJobs: active,
            totalApplicants: allApplicants.length,
            interviews: interviewsCount,
            offers: offersCount
          });
        }
      } catch (err) {
        console.error('Failed to load employer dashboard:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployerDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome header & CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Employer Workspace Dashboard</h1>
          <p className="text-text-secondary text-sm">Post new positions, moderate AI compliance signals, and select candidates.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => navigate('/provider/jobs/new')}>
          <Plus size={18} /> Post a New Job
        </Button>
      </div>

      {/* Row 1: Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Active Job Posts</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{stats.activeJobs}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Briefcase size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Total Applicants</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{stats.totalApplicants}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Users size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Interviews Scheduled</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{stats.interviews}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Calendar size={24} />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <span className="text-text-muted text-xs font-semibold uppercase">Offers Accepted</span>
            <span className="text-3xl font-extrabold text-text-primary block mt-1">{stats.offers}</span>
          </div>
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full">
            <Award size={24} />
          </div>
        </Card>
      </div>

      {/* Row 2: Grid details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Job Posts */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">Recent Job Listings</h3>
            <Link to="/provider/jobs" className="text-xs text-brand-green hover:underline flex items-center gap-1 font-semibold">
              Manage All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {jobs.length === 0 ? (
              <Card className="p-8 text-center text-text-secondary">No job postings created yet.</Card>
            ) : (
              jobs.slice(0, 5).map((job) => (
                <Card 
                  key={job._id}
                  hoverEffect
                  onClick={() => navigate(`/provider/jobs/${job._id}/applicants`)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-text-primary text-base">{job.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                      <span>Type: <span className="capitalize">{job.employmentType}</span></span>
                      <span>•</span>
                      <span>Salary: ${job.salaryRange?.min} - ${job.salaryRange?.max} USD</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant={
                      job.status === 'published' ? 'success' : 
                      job.status === 'pending_review' ? 'warning' : 'neutral'
                    } className="capitalize">
                      {job.status === 'pending_review' ? 'Pending Admin Review' : job.status}
                    </Badge>
                    <span className="text-xs text-brand-green font-semibold">View Applicants →</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Applicants */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-text-primary">Recent Applicants</h3>
          
          <div className="bg-bg-surface border border-border-subtle rounded-card p-6 flex flex-col gap-6">
            {recentApplicants.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6">No application submissions yet.</p>
            ) : (
              recentApplicants.map((app) => (
                <div 
                  key={app._id} 
                  className="flex flex-col gap-2 border-b border-border-subtle last:border-0 pb-4 last:pb-0 cursor-pointer"
                  onClick={() => navigate(`/provider/jobs/${app.job}/applicants`)}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-sm text-text-primary">{app.jobseeker?.name}</h5>
                    <span className="text-xs font-extrabold text-brand-green">{app.matchScore}% Match</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-text-secondary">
                    <span className="truncate max-w-[150px]">{app.jobTitle}</span>
                    <Badge variant={app.status === 'rejected' ? 'danger' : 'info'} className="text-[10px] scale-90">
                      {app.status}
                    </Badge>
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
