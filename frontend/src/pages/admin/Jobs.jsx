import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  Search, MapPin, Users, Check, X, EyeOff, Archive, ShieldAlert,
  Sparkles, AlertTriangle, Mail, Building2, Loader2,
} from 'lucide-react';

const STATUS_META = {
  pending_review: { label: 'Pending review', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  flagged: { label: 'Not approved', variant: 'danger' },
  closed: { label: 'Closed', variant: 'neutral' },
  draft: { label: 'Draft', variant: 'neutral' },
};

/**
 * What an administrator can do to a job from each state.
 *
 * Publication is an administrator decision — an employer can only ever ask.
 * Withdrawing a live job returns it to the review queue rather than deleting
 * it, so the employer can fix it and ask again.
 */
const ACTIONS = {
  pending_review: [
    { status: 'published', label: 'Approve and publish', icon: Check, variant: 'primary' },
    { status: 'flagged', label: 'Reject', icon: X, variant: 'secondary', needsNote: true },
  ],
  published: [
    { status: 'pending_review', label: 'Withdraw for review', icon: EyeOff, variant: 'secondary', needsNote: true },
    { status: 'closed', label: 'Close', icon: Archive, variant: 'ghost' },
  ],
  flagged: [
    { status: 'published', label: 'Approve and publish', icon: Check, variant: 'primary' },
    { status: 'closed', label: 'Close', icon: Archive, variant: 'ghost' },
  ],
  closed: [
    { status: 'pending_review', label: 'Return to review', icon: ShieldAlert, variant: 'secondary' },
  ],
  draft: [
    { status: 'pending_review', label: 'Move to review', icon: ShieldAlert, variant: 'secondary' },
  ],
};

const TABS = [
  { key: 'pending_review', label: 'Needs review' },
  { key: 'published', label: 'Live' },
  { key: 'flagged', label: 'Not approved' },
  { key: 'closed', label: 'Closed' },
  { key: '', label: 'All' },
];

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [byStatus, setByStatus] = useState({});
  const [tab, setTab] = useState('pending_review');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Confirmation modal for actions that carry a note to the employer.
  const [pending, setPending] = useState(null); // { job, action }
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/jobs');
      if (res.data?.success) {
        setJobs(res.data.data);
        setByStatus(res.data.byStatus || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const apply = async (job, action, withNote = '') => {
    setBusy(job._id);
    setNotice('');
    setError('');
    try {
      const res = await api.put(`/admin/jobs/${job._id}/status`, {
        status: action.status,
        note: withNote,
      });
      if (res.data?.success) {
        setNotice(res.data.message);
        await load();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update that job.');
    } finally {
      setBusy(null);
      setPending(null);
      setNote('');
    }
  };

  const run = (job, action) => {
    if (action.needsNote) {
      setPending({ job, action });
      setNote('');
    } else {
      apply(job, action);
    }
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobs
      .filter((j) => (tab ? j.status === tab : true))
      .filter((j) => !term
        || j.title.toLowerCase().includes(term)
        || (j.company?.name || '').toLowerCase().includes(term));
  }, [jobs, tab, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <div className="flex items-center gap-2 bg-success/10 border border-success/25 text-success rounded-input p-3 text-sm">
          <Mail size={15} /> {notice}
        </div>
      )}
      {error && (
        <div className="bg-danger/8 border border-danger/25 text-danger rounded-input p-3 text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const count = t.key ? (byStatus[t.key] ?? 0) : jobs.length;
            const active = tab === t.key;
            return (
              <button
                key={t.key || 'all'}
                onClick={() => setTab(t.key)}
                className={`px-3.5 h-9 rounded-btn text-sm font-semibold transition-colors border ${
                  active
                    ? 'bg-brand-deep text-text-inverse border-brand-deep'
                    : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-strong'
                }`}
              >
                {t.label}
                <span className={`ml-2 text-xs tabular-nums ${active ? 'text-text-onDeepDim' : 'text-text-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or company"
            className="h-9 pl-9 pr-4 w-64 bg-bg-surface border border-border-subtle rounded-input text-sm
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="text-center py-12 text-text-secondary">
          {tab === 'pending_review'
            ? 'Nothing is waiting for review. Every submitted job has been decided.'
            : 'No jobs match this filter.'}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((job) => {
            const meta = STATUS_META[job.status] || { label: job.status, variant: 'neutral' };
            const actions = ACTIONS[job.status] || [];
            const flags = job.aiQualityFlags || [];

            return (
              <Card key={job._id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-primary">{job.title}</h3>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {job.company?.isVerified && <Badge variant="info">Verified employer</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary mt-1.5">
                      <span className="flex items-center gap-1"><Building2 size={12} /> {job.company?.name || '—'}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {job.location?.city || '—'}, {job.location?.country || '—'}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {job.applicantCount} applicant{job.applicantCount === 1 ? '' : 's'}</span>
                      <span>Posted by {job.postedBy?.name || '—'}</span>
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-pill tabular-nums ${
                      job.aiQualityScore >= 80
                        ? 'bg-success/10 text-success'
                        : job.aiQualityScore >= 50
                          ? 'bg-accent-ochreMuted text-accent-ochreInk'
                          : 'bg-danger/10 text-danger'
                    }`}>
                      <Sparkles size={11} className="inline mr-1" />AI {job.aiQualityScore}%
                    </span>
                  </div>
                </div>

                {flags.length > 0 && (
                  <div className="flex items-start gap-2 bg-accent-ochreMuted border border-accent-ochre/35 rounded-input p-2.5">
                    <AlertTriangle size={14} className="text-accent-ochreInk shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-accent-ochreInk">
                        The automatic screen raised {flags.length} concern{flags.length === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">{flags.join(' · ')}</p>
                    </div>
                  </div>
                )}

                {job.aiSuggestions && (
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{job.aiSuggestions}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle">
                  {actions.map((a) => (
                    <Button
                      key={a.status}
                      variant={a.variant}
                      className="h-9 text-xs gap-1.5 mt-3"
                      disabled={busy === job._id}
                      onClick={() => run(job, a)}
                    >
                      {busy === job._id ? <Loader2 size={13} className="animate-spin" /> : <a.icon size={13} />}
                      {a.label}
                    </Button>
                  ))}
                  <span className="text-[11px] text-text-muted mt-3 ml-1">
                    The employer is emailed about every decision.
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Note prompt for decisions the employer will read */}
      <Modal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={pending ? pending.action.label : ''}
        subtitle={pending ? pending.job.title : ''}
      >
        {pending && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              {pending.action.status === 'flagged'
                ? 'This job will not be published, and the employer will be emailed. Telling them why lets them fix it and submit again.'
                : 'This job will be taken off the public site and returned to the review queue. The employer will be emailed.'}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">
                Reason for the employer <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. The salary range is missing, and the description does not say where the role is based."
                className="w-full p-3 bg-bg-primary border border-border-subtle rounded-input text-sm
                  text-text-primary placeholder:text-text-muted resize-none focus:outline-none
                  focus:border-brand-green focus:ring-4 focus:ring-brand-green/18"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setPending(null)}>Cancel</Button>
              <Button
                variant={pending.action.status === 'flagged' ? 'danger' : 'primary'}
                fullWidth
                disabled={busy === pending.job._id}
                onClick={() => apply(pending.job, pending.action, note.trim())}
              >
                {busy === pending.job._id ? 'Working...' : pending.action.label}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Jobs;
