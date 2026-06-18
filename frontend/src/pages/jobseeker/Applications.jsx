import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Calendar, Building, MapPin, ClipboardList, Clock } from 'lucide-react';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Application for detail modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const res = await api.get('/applications/mine');
        if (res.data?.success) {
          setApplications(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load applications:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleOpenDetail = (app) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'hired':
        return 'success';
      case 'offer':
        return 'success';
      case 'interview':
        return 'info';
      case 'shortlisted':
        return 'info';
      case 'reviewed':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'neutral';
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
      {applications.length === 0 ? (
        <Card className="text-center py-12 text-text-secondary">
          You have not applied to any job listings yet.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => (
            <Card
              key={app._id}
              hoverEffect
              onClick={() => handleOpenDetail(app)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-lg text-text-primary">{app.job?.title}</h3>
                <p className="text-sm text-text-secondary flex items-center gap-1.5">
                  <Building size={14} className="text-brand-green" />
                  {app.job?.company?.name}
                </p>

                <div className="flex items-center gap-4 text-xs text-text-muted mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {app.job?.location?.city || 'Somalia'}, {app.job?.location?.country || 'Somalia'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Applied: {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 self-end sm:self-center">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-text-muted font-mono uppercase">ATS Status</span>
                  <Badge variant={getStatusVariant(app.status)} className="capitalize px-3 py-1">
                    {app.status}
                  </Badge>
                </div>
                <Button variant="ghost" className="px-3 py-1">Details →</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Application Detail Timeline Modal */}
      {selectedApp && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Application Details - ${selectedApp.job?.title}`}
          className="max-w-xl"
        >
          <div className="flex flex-col gap-6">
            {/* Header metadata summary */}
            <div className="bg-bg-elevated p-4 rounded-card border border-border-subtle flex flex-col gap-1.5">
              <h4 className="font-bold text-text-primary text-base">{selectedApp.job?.title}</h4>
              <p className="text-sm text-text-secondary">{selectedApp.job?.company?.name}</p>
              <span className="text-xs text-text-muted">Match compatibility: {selectedApp.matchScore}%</span>
            </div>

            {/* Cover Note */}
            <div>
              <h5 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <ClipboardList size={16} className="text-brand-green" />
                Submitted Cover Note
              </h5>
              <div className="bg-bg-primary/50 border border-border-subtle p-4 rounded-card text-xs text-text-secondary leading-relaxed font-mono whitespace-pre-line">
                {selectedApp.coverNote || 'No cover note provided.'}
              </div>
            </div>

            {/* Application Progress Timeline */}
            <div>
              <h5 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Clock size={16} className="text-brand-green" />
                ATS Status Timeline
              </h5>
              
              <div className="relative pl-6 border-l-2 border-border-strong flex flex-col gap-6 ml-3">
                {selectedApp.statusHistory?.map((hist, idx) => (
                  <div key={hist._id || idx} className="relative">
                    {/* Circle marker */}
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-brand-green bg-bg-surface" />
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold capitalize text-text-primary">{hist.status}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(hist.changedAt).toLocaleString()}
                        </span>
                      </div>
                      {hist.note && <p className="text-xs text-text-secondary mt-1">{hist.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-border-subtle pt-4">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Applications;
