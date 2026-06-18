import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Search, MapPin, DollarSign, Calendar, Sparkles, Building } from 'lucide-react';

const Jobs = () => {
  const [searchParams] = useSearchParams();
  const initialJobId = searchParams.get('id');

  const [jobsData, setJobsData] = useState([]); // Array of { job, score, breakdown }
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Selected Job Details Modal
  const [selectedItem, setSelectedItem] = useState(null); // { job, score, breakdown }
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Apply Modal
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Fetch AI ranked jobs with pre-computed matching scores
      const res = await api.get('/profile/recommendations');
      if (res.data?.success) {
        setJobsData(res.data.data);
        setFilteredJobs(res.data.data);
        
        // If a specific job ID was passed in URL query, open it immediately
        if (initialJobId) {
          const item = res.data.data.find(d => d.job._id === initialJobId);
          if (item) {
            setSelectedItem(item);
            setIsDetailOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load recommended jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [initialJobId]);

  // Apply filtering
  useEffect(() => {
    let result = jobsData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.job.title.toLowerCase().includes(term) ||
          item.job.description.toLowerCase().includes(term) ||
          (item.job.company?.name || '').toLowerCase().includes(term)
      );
    }

    if (cityFilter) {
      const city = cityFilter.toLowerCase();
      result = result.filter((item) => (item.job.location?.city || '').toLowerCase().includes(city));
    }

    if (typeFilter) {
      result = result.filter((item) => item.job.employmentType === typeFilter);
    }

    setFilteredJobs(result);
  }, [searchTerm, cityFilter, typeFilter, jobsData]);

  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleOpenApply = () => {
    setApplyError('');
    setApplySuccess('');
    setCoverNote('');
    setIsApplyOpen(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    setApplyLoading(true);

    try {
      const res = await api.post('/applications', {
        jobId: selectedItem.job._id,
        coverNote
      });

      if (res.data?.success) {
        setApplySuccess('Application submitted successfully!');
        setTimeout(() => {
          setIsApplyOpen(false);
          setIsDetailOpen(false);
          fetchJobs(); // Refresh jobs status
        }, 1500);
      }
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplyLoading(false);
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
    <div className="flex flex-col gap-6">
      {/* Search & Filter Header */}
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search job title, description or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm"
          />
        </div>

        <Input
          placeholder="Filter by city (e.g. Mogadishu)"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-input"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full px-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
        >
          <option value="">All Employment Types</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
          <option value="remote">Remote</option>
        </select>
      </Card>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredJobs.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-text-secondary">
            No matching job listings found.
          </div>
        ) : (
          filteredJobs.map((item) => {
            const { job, score } = item;
            return (
              <Card
                key={job._id}
                hoverEffect
                onClick={() => handleOpenDetail(item)}
                className="flex flex-col justify-between h-[200px]"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-text-primary truncate max-w-[250px]">{job.title}</h3>
                      <p className="text-sm text-text-secondary truncate mt-0.5">{job.company?.name || 'Company'}</p>
                    </div>
                    
                    {/* Match Score */}
                    <div className="flex flex-col items-end">
                      <Badge variant="success" className="gap-1 px-2.5 py-1 text-xs">
                        <Sparkles size={12} /> {score}% Match
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-muted mt-4">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {job.location?.city}, {job.location?.country}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{job.employmentType}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-4 text-xs text-text-muted">
                  <span>Salary: ${job.salaryRange?.min} - ${job.salaryRange?.max} /mo</span>
                  <span className="text-brand-green font-semibold">View Details →</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Job Details Modal */}
      {selectedItem && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedItem.job.title}
          className="max-w-2xl"
        >
          <div className="flex flex-col gap-6">
            {/* Header info */}
            <div className="flex justify-between items-start bg-bg-elevated p-4 rounded-card border border-border-subtle">
              <div>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <Building size={18} className="text-brand-green" />
                  {selectedItem.job.company?.name}
                </h4>
                <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1.5">
                  <MapPin size={14} /> {selectedItem.job.location?.city}, {selectedItem.job.location?.country}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-text-muted block">AI Match compatibility</span>
                <span className="text-2xl font-extrabold text-brand-green">{selectedItem.score}%</span>
              </div>
            </div>

            {/* Match Score Breakdown */}
            <div className="bg-bg-elevated/40 border border-border-subtle rounded-card p-4">
              <h5 className="text-sm font-semibold text-text-primary mb-3">Matching Compatibility Breakdown</h5>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 bg-bg-surface rounded border border-border-subtle">
                  <span className="text-text-muted block mb-1">Skills</span>
                  <span className="font-bold text-brand-green">{selectedItem.breakdown?.skills}%</span>
                </div>
                <div className="p-2 bg-bg-surface rounded border border-border-subtle">
                  <span className="text-text-muted block mb-1">Location</span>
                  <span className="font-bold text-brand-green">{selectedItem.breakdown?.location}%</span>
                </div>
                <div className="p-2 bg-bg-surface rounded border border-border-subtle">
                  <span className="text-text-muted block mb-1">Salary</span>
                  <span className="font-bold text-brand-green">{selectedItem.breakdown?.salary}%</span>
                </div>
                <div className="p-2 bg-bg-surface rounded border border-border-subtle">
                  <span className="text-text-muted block mb-1">Education</span>
                  <span className="font-bold text-brand-green">{selectedItem.breakdown?.education}%</span>
                </div>
                <div className="p-2 bg-bg-surface rounded border border-border-subtle">
                  <span className="text-text-muted block mb-1">Experience</span>
                  <span className="font-bold text-brand-green">{selectedItem.breakdown?.experience}%</span>
                </div>
              </div>
            </div>

            {/* Job details */}
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-wrap gap-6 text-text-secondary border-b border-border-subtle pb-4">
                <div className="flex items-center gap-1.5">
                  <DollarSign size={16} className="text-brand-green" />
                  <span>Salary: ${selectedItem.job.salaryRange?.min} - ${selectedItem.job.salaryRange?.max} USD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-brand-green" />
                  <span>Type: <span className="capitalize">{selectedItem.job.employmentType}</span></span>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-text-primary mb-2">Required Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.job.skillsRequired?.map((skill, idx) => (
                    <Badge key={idx}>{skill}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-bold text-text-primary mb-2">Job Description</h5>
                <div className="text-text-secondary leading-relaxed whitespace-pre-line bg-bg-primary/50 p-4 rounded-card border border-border-subtle font-mono text-xs max-h-[200px] overflow-y-auto">
                  {selectedItem.job.description}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
              <Button variant="primary" onClick={handleOpenApply}>Apply Now</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Apply Modal */}
      {selectedItem && (
        <Modal
          isOpen={isApplyOpen}
          onClose={() => setIsApplyOpen(false)}
          title={`Apply to ${selectedItem.job.title}`}
        >
          <form onSubmit={handleApplySubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Cover Letter / Note</label>
              <textarea
                placeholder="Describe why you are a great fit for this opportunity..."
                rows={5}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary placeholder:text-text-muted transition-colors duration-200"
              />
            </div>

            {applyError && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-btn p-3 text-sm">
                {applyError}
              </div>
            )}

            {applySuccess && (
              <div className="bg-success/10 border border-success/30 text-success rounded-btn p-3 text-sm font-semibold">
                {applySuccess}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsApplyOpen(false)} disabled={applyLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={applyLoading}>
                {applyLoading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Jobs;
