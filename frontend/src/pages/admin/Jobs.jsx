import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { AlertTriangle, Check, X, ShieldAlert, FileText, Eye } from 'lucide-react';

const Jobs = () => {
  const [pendingJobs, setPendingJobs] = useState([]);
  const [publishedJobs, setPublishedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'published'

  // Modal detailed view
  const [selectedJob, setSelectedJob] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const [pendingRes, publishedRes] = await Promise.all([
        api.get('/admin/jobs/pending'),
        api.get('/jobs') // Public published jobs
      ]);

      if (pendingRes.data?.success) setPendingJobs(pendingRes.data.data);
      if (publishedRes.data?.success) setPublishedJobs(publishedRes.data.data);
    } catch (err) {
      console.error('Failed to load jobs for admin:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleReview = async (jobId, decision) => {
    setActionLoading(true);
    try {
      const res = await api.put(`/admin/jobs/${jobId}/review`, {
        action: decision,
        note: `Admin review action: ${decision}`
      });

      if (res.data?.success) {
        alert(`Job listing has been ${decision === 'approve' ? 'approved and published' : 'rejected'}`);
        setIsDetailOpen(false);
        fetchJobs();
      }
    } catch (err) {
      alert('Review action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (job) => {
    setSelectedJob(job);
    setIsDetailOpen(true);
  };

  if (loading && pendingJobs.length === 0 && publishedJobs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs toggle */}
      <div className="flex border-b border-border-subtle gap-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'pending' ? 'text-brand-green' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Pending Review ({pendingJobs.length})
          {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('published')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'published' ? 'text-brand-green' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          All Published Jobs ({publishedJobs.length})
          {activeTab === 'published' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green rounded-full" />}
        </button>
      </div>

      {/* Pending Reviews list */}
      {activeTab === 'pending' && (
        <div className="flex flex-col gap-4">
          {pendingJobs.length === 0 ? (
            <Card className="text-center py-12 text-text-secondary">
              No job postings currently pending review.
            </Card>
          ) : (
            pendingJobs.map((job) => (
              <Card key={job._id} className="border-warning/30 bg-warning/5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{job.title}</h3>
                    <p className="text-sm text-text-secondary mt-0.5">Recruiter: {job.postedBy?.name} • Company: {job.company?.name}</p>
                  </div>
                  <Badge variant="danger" className="text-sm px-3 py-1 font-bold">
                    AI Quality Score: {job.aiQualityScore}%
                  </Badge>
                </div>

                {job.aiQualityFlags?.length > 0 && (
                  <div className="flex items-start gap-2 bg-danger/10 border border-danger/20 text-danger p-3 rounded-card text-xs">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span><strong>AI Quality Flags:</strong> {job.aiQualityFlags.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border-subtle/50 pt-3">
                  <span className="text-xs text-text-muted">Posted: {new Date(job.createdAt).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="h-8 text-xs gap-1.5" onClick={() => handleOpenDetail(job)}>
                      <Eye size={14} /> Audit Details
                    </Button>
                    <Button variant="danger" className="h-8 text-xs gap-1" onClick={() => handleReview(job._id, 'reject')} disabled={actionLoading}>
                      <X size={14} /> Reject
                    </Button>
                    <Button variant="primary" className="h-8 text-xs gap-1" onClick={() => handleReview(job._id, 'approve')} disabled={actionLoading}>
                      <Check size={14} /> Approve & Publish
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Published jobs table list */}
      {activeTab === 'published' && (
        <Card className="p-0 overflow-hidden border border-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-bg-elevated border-b border-border-subtle text-text-secondary">
                  <th className="p-4">Job Title</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Salary Range</th>
                  <th className="p-4">AI Quality</th>
                  <th className="p-4">Published Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {publishedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-text-secondary">No published jobs found.</td>
                  </tr>
                ) : (
                  publishedJobs.map((job) => (
                    <tr key={job._id} className="border-b border-border-subtle hover:bg-bg-elevated/20">
                      <td className="p-4 font-semibold text-text-primary">{job.title}</td>
                      <td className="p-4 text-text-secondary">{job.company?.name}</td>
                      <td className="p-4 text-text-muted">{job.location?.city}, {job.location?.country}</td>
                      <td className="p-4 text-text-secondary">${job.salaryRange?.min} - ${job.salaryRange?.max} USD</td>
                      <td className="p-4">
                        <Badge variant="success">Score: {job.aiQualityScore}%</Badge>
                      </td>
                      <td className="p-4 text-text-muted">
                        {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="secondary" className="h-8 text-xs" onClick={() => handleOpenDetail(job)}>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Job Audit Details Modal */}
      {selectedJob && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Job Moderation Review - ${selectedJob.title}`}
          className="max-w-2xl"
        >
          <div className="flex flex-col gap-6 text-sm text-text-secondary leading-relaxed">
            <div className="bg-bg-elevated p-4 rounded-card border border-border-subtle">
              <h4 className="font-bold text-text-primary text-base">{selectedJob.title}</h4>
              <p className="text-xs text-text-secondary mt-1">Company: {selectedJob.company?.name}</p>
              <p className="text-xs text-text-muted mt-2">Salary Expectation: ${selectedJob.salaryRange?.min} - ${selectedJob.salaryRange?.max} USD • {selectedJob.employmentType}</p>
            </div>

            {/* AI suggestions */}
            {selectedJob.aiSuggestions && (
              <div className="bg-brand-green/10 border border-brand-green/30 text-brand-green p-4 rounded-card">
                <h5 className="font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={16} /> AI Moderation Suggestions
                </h5>
                <p className="text-xs leading-normal">{selectedJob.aiSuggestions}</p>
              </div>
            )}

            {/* Job description */}
            <div>
              <h5 className="font-bold text-text-primary mb-2 flex items-center gap-1.5">
                <FileText size={16} /> Job Description Content
              </h5>
              <div className="bg-bg-primary/50 border border-border-subtle p-4 rounded-card text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono max-h-[200px] overflow-y-auto">
                {selectedJob.description}
              </div>
            </div>

            {/* Actions inside Modal if pending */}
            {selectedJob.status === 'pending_review' && (
              <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4 mt-2">
                <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
                <Button variant="danger" onClick={() => handleReview(selectedJob._id, 'reject')} disabled={actionLoading}>
                  Reject Job
                </Button>
                <Button variant="primary" onClick={() => handleReview(selectedJob._id, 'approve')} disabled={actionLoading}>
                  Approve & Publish
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Jobs;
