import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Calendar, Users, MapPin } from 'lucide-react';

const MyJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicantCounts, setApplicantCounts] = useState({});

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/jobs/company/mine');
        if (res.data?.success) {
          const myJobs = res.data.data;
          setJobs(myJobs);

          // Fetch applicant counts for each job
          const counts = {};
          await Promise.all(
            myJobs.map(async (job) => {
              try {
                const appRes = await api.get(`/applications/job/${job._id}`);
                if (appRes.data?.success) {
                  counts[job._id] = appRes.data.data.length;
                }
              } catch (e) {
                counts[job._id] = 0;
              }
            })
          );
          setApplicantCounts(counts);
        }
      } catch (err) {
        console.error('Failed to load company jobs:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {jobs.length === 0 ? (
        <Card className="text-center py-12 text-text-secondary">
          No job listings posted yet. Click "Post a New Job" to begin.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.map((job) => (
            <Card
              key={job._id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-lg text-text-primary">{job.title}</h3>
                
                <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {job.location?.city}, {job.location?.country}
                  </span>
                  <span>•</span>
                  <span>Type: <span className="capitalize">{job.employmentType}</span></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 self-end md:self-center">
                <div className="flex items-center gap-4">
                  <Badge variant={
                    job.status === 'published' ? 'success' : 
                    job.status === 'pending_review' ? 'warning' : 'neutral'
                  } className="capitalize px-3 py-1">
                    {job.status === 'pending_review' ? 'Pending Review' : job.status}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-elevated border border-border-subtle px-3 py-1.5 rounded-btn">
                    <Users size={14} className="text-brand-green" />
                    <span>{applicantCounts[job._id] || 0} Applicants</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="h-9 text-xs"
                  onClick={() => navigate(`/provider/jobs/${job._id}/applicants`)}
                >
                  View Applicants
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyJobs;
