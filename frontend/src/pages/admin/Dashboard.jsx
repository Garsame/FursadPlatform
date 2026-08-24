import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Users, Briefcase, FileClock, ShieldAlert, Check, X, Building2, FileText,
  Target, TrendingUp, MapPin, Sparkles, UserX, MailWarning, ArrowRight, Activity,
} from 'lucide-react';

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);
const ago = (d) => {
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

/* ---------------------------------------------------------------- pieces */

const Stat = ({ icon: Icon, label, value, sub, tone = 'neutral', onClick }) => {
  const tones = {
    neutral: 'text-text-primary',
    brand: 'text-brand-deep',
    good: 'text-success',
    warn: 'text-accent-ochreInk',
    bad: 'text-danger',
  };
  return (
    <Card
      hoverEffect={!!onClick}
      onClick={onClick}
      className="flex flex-col gap-1"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
        <Icon size={13} /> {label}
      </span>
      <span className={`text-3xl font-extrabold mt-1 tabular-nums ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted leading-snug">{sub}</span>}
    </Card>
  );
};

/** Horizontal bar row — used for the funnel, cities, skills and employers. */
const BarRow = ({ label, value, max, right, color = 'bg-brand-green' }) => (
  <div className="flex items-center gap-3">
    <span className="w-32 shrink-0 text-xs text-text-secondary truncate" title={label}>{label}</span>
    <div className="flex-1 h-6 bg-bg-elevated rounded-btn overflow-hidden">
      <div
        className={`h-full ${color} rounded-btn transition-all duration-500`}
        style={{ width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0}%` }}
      />
    </div>
    <span className="w-20 shrink-0 text-xs font-semibold text-text-primary text-right tabular-nums">
      {right ?? value}
    </span>
  </div>
);

/** Three cumulative series on one set of axes, drawn by hand. */
const GrowthChart = ({ series }) => {
  const all = series.flatMap((s) => s.points.map((p) => p.count));
  const max = Math.max(...all, 1);
  const W = 520, H = 170, PAD_L = 34, PAD_B = 24;
  const n = series[0].points.length;

  const xy = (i, v) => [
    PAD_L + (i / Math.max(n - 1, 1)) * (W - PAD_L - 10),
    H - PAD_B - (v / max) * (H - PAD_B - 12),
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[460px]" role="img"
           aria-label="Cumulative growth of users, jobs and applications over six months">
        {[0, 0.5, 1].map((f) => {
          const y = H - PAD_B - f * (H - PAD_B - 12);
          return (
            <g key={f}>
              <line x1={PAD_L} y1={y} x2={W - 10} y2={y} stroke="#E7E4DB" strokeWidth="1" />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#6B7A73">
                {Math.round(max * f)}
              </text>
            </g>
          );
        })}

        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points.map((p, i) => xy(i, p.count).join(',')).join(' ')}
          />
        ))}

        {series[0].points.map((p, i) => (
          <text key={i} x={xy(i, 0)[0]} y={H - 6} textAnchor="middle" fontSize="9" fill="#6B7A73">
            {p.month}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-4 mt-2 pl-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
            {s.name}
            <span className="font-semibold text-text-primary tabular-nums">
              {s.points[s.points.length - 1].count}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

const Panel = ({ title, icon: Icon, action, children, empty }) => (
  <Card className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-bold text-text-primary flex items-center gap-2 text-sm">
        {Icon && <Icon size={16} className="text-brand-deep" />} {title}
      </h3>
      {action}
    </div>
    {empty ? <p className="text-sm text-text-muted py-4 text-center">{empty}</p> : children}
  </Card>
);

/* ------------------------------------------------------------- dashboard */

const Dashboard = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionOn, setActionOn] = useState(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [a, u, j, l] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users'),
        api.get('/admin/jobs/pending'),
        api.get('/admin/audit-log'),
      ]);
      if (a.data?.success) setData(a.data.data);
      if (u.data?.success) setRecentUsers(u.data.data.slice(0, 6));
      if (j.data?.success) setPendingJobs(j.data.data);
      if (l.data?.success) setAudit(l.data.data.slice(0, 7));
    } catch (err) {
      console.error('Failed to load admin dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const review = async (jobId, decision) => {
    setActionOn(jobId);
    setNotice('');
    try {
      const res = await api.put(`/admin/jobs/${jobId}/review`, { action: decision });
      if (res.data?.success) {
        setNotice(res.data.message);
        await load();
      }
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not complete that action.');
    } finally {
      setActionOn(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  if (!data) {
    return <Card className="text-center py-12 text-text-secondary">Analytics could not be loaded.</Card>;
  }

  const { summary: s, breakdown, funnel, matchDistribution, topCities, topEmployers, topSkills, charts } = data;
  const funnelMax = funnel[0]?.count || 1;
  const matchMax = Math.max(...matchDistribution.map((b) => b.count), 1);

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="bg-success/10 border border-success/25 text-success rounded-input p-3 text-sm">
          {notice}
        </div>
      )}

      {/* Anything requiring a decision sits above everything else. */}
      {pendingJobs.length > 0 && (
        <Card className="border-accent-ochre/45 bg-accent-ochreMuted flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-accent-ochreInk flex items-center gap-2">
              <ShieldAlert size={17} />
              {pendingJobs.length} job{pendingJobs.length === 1 ? '' : 's'} waiting for your approval
            </h3>
            <Button variant="secondary" className="h-9 text-xs" onClick={() => navigate('/admin/jobs')}>
              Open review queue <ArrowRight size={13} />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {pendingJobs.slice(0, 4).map((job) => (
              <div key={job._id}
                   className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface border border-border-subtle rounded-input p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{job.title}</p>
                  <p className="text-xs text-text-muted truncate">
                    {job.company?.name} · {job.location?.city || '—'} · AI quality {job.aiQualityScore}%
                    {job.aiQualityFlags?.length > 0 && ` · ${job.aiQualityFlags.length} flag(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="primary" className="h-8 text-xs gap-1"
                          disabled={actionOn === job._id}
                          onClick={() => review(job._id, 'approve')}>
                    <Check size={13} /> Approve
                  </Button>
                  <Button variant="secondary" className="h-8 text-xs gap-1"
                          disabled={actionOn === job._id}
                          onClick={() => review(job._id, 'reject')}>
                    <X size={13} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Users" value={s.totalUsers}
              sub={`${s.newUsers7} new this week · ${s.jobseekersCount} seekers, ${s.employersCount} employers`}
              onClick={() => navigate('/admin/users')} />
        <Stat icon={Briefcase} label="Live jobs" value={s.livejobs} tone="brand"
              sub={`${s.totalJobs} posted in total · ${s.newJobs7} this week`}
              onClick={() => navigate('/admin/jobs')} />
        <Stat icon={FileText} label="Applications" value={s.totalApplications}
              sub={`${s.newApps7} this week · ${s.applicationsPerJob} per job`} />
        <Stat icon={FileClock} label="Awaiting review" value={s.pendingReviews}
              tone={s.pendingReviews > 0 ? 'warn' : 'good'}
              sub={s.pendingReviews > 0 ? 'Needs your decision' : 'Nothing waiting'}
              onClick={() => navigate('/admin/jobs')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Target} label="Avg match score"
              value={s.avgMatchScore === null ? '—' : `${s.avgMatchScore}%`}
              sub={s.avgMatchSampleSize > 0
                ? `across ${s.avgMatchSampleSize} applications · range ${s.matchRange.min}–${s.matchRange.max}%`
                : 'no scored applications yet'} />
        <Stat icon={TrendingUp} label="Hire rate" value={`${s.hireRate}%`}
              tone={s.hireRate > 0 ? 'good' : 'neutral'}
              sub={`${breakdown.applicationsByStatus.hired} hired of ${s.totalApplications}`} />
        <Stat icon={Building2} label="Companies" value={s.totalCompanies}
              sub={`${s.verifiedCompanies} verified · profiles ${s.avgCompanyCompleteness}% complete`} />
        <Stat icon={UserX} label="Suspended" value={s.suspendedUsersCount}
              tone={s.suspendedUsersCount > 0 ? 'bad' : 'neutral'}
              sub={`${s.unverifiedUsers} never verified their email`}
              onClick={() => navigate('/admin/users')} />
      </div>

      {/* Growth + funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Growth over the last six months" icon={Activity}>
          <GrowthChart series={[
            { name: 'Users', color: '#0B5C43', points: charts.userGrowth },
            { name: 'Jobs', color: '#00C27C', points: charts.jobsGrowth },
            { name: 'Applications', color: '#E0A340', points: charts.applicationsGrowth },
          ]} />
          <p className="text-[11px] text-text-muted">
            Cumulative totals, read from when each record was created.
          </p>
        </Panel>

        <Panel title="Hiring funnel" icon={TrendingUp}
               empty={s.totalApplications === 0 ? 'No applications yet.' : null}>
          <div className="flex flex-col gap-2.5">
            {funnel.map((f) => (
              <BarRow key={f.stage} label={f.stage} value={f.count} max={funnelMax}
                      right={`${f.count} · ${pct(f.count, funnelMax)}%`}
                      color={f.stage === 'Hired' ? 'bg-success' : 'bg-brand-deep'} />
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            How far applicants get. Each stage counts everyone who reached it or went further.
          </p>
        </Panel>
      </div>

      {/* Distribution + market */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Match score distribution" icon={Target}
               empty={matchDistribution.length === 0 ? 'No scored applications yet.' : null}>
          <div className="flex flex-col gap-2.5">
            {matchDistribution.map((b) => (
              <BarRow key={b.band} label={b.band} value={b.count} max={matchMax}
                      color={b.band === 'Under 40%' ? 'bg-danger/70' : 'bg-brand-green'} />
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            A healthy platform has most applications above 60%. Heavy weighting below 40% means
            people are applying to roles that do not fit them.
          </p>
        </Panel>

        <Panel title="Where the jobs are" icon={MapPin}
               empty={topCities.length === 0 ? 'No jobs with a city set.' : null}>
          <div className="flex flex-col gap-2.5">
            {topCities.map((c) => (
              <BarRow key={c.city} label={c.city} value={c.jobs}
                      max={Math.max(...topCities.map((x) => x.jobs), 1)}
                      right={`${c.jobs} job${c.jobs === 1 ? '' : 's'}`} />
            ))}
          </div>
        </Panel>
      </div>

      {/* Employers + skills */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Employers drawing the most candidates" icon={Building2}
               empty={topEmployers.length === 0 ? 'No applications yet.' : null}>
          <div className="flex flex-col gap-2.5">
            {topEmployers.map((e) => (
              <BarRow key={e.name} label={e.name} value={e.applications}
                      max={Math.max(...topEmployers.map((x) => x.applications), 1)}
                      right={`${e.applications} · ${e.avgScore}%`}
                      color="bg-brand-deep" />
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            Applications received, and the average match score of those applicants.
          </p>
        </Panel>

        <Panel title="Most demanded skills" icon={Sparkles}
               empty={topSkills.length === 0 ? 'No published jobs list any skills.' : null}>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((sk) => (
              <span key={sk.skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-brand-muted
                      border border-brand-green/30 text-xs font-semibold text-brand-deep capitalize">
                {sk.skill}
                <span className="text-[10px] text-text-muted tabular-nums">{sk.demand}</span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            Counted across live vacancies. Useful for telling candidates what to learn next.
          </p>
        </Panel>
      </div>

      {/* Recent users + audit */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Newest users" icon={Users}
               action={<Button variant="ghost" className="h-8 text-xs" onClick={() => navigate('/admin/users')}>View all</Button>}
               empty={recentUsers.length === 0 ? 'No users yet.' : null}>
          <div className="flex flex-col gap-2">
            {recentUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border-subtle last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{u.name}</p>
                  <p className="text-xs text-text-muted truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!u.isVerified && <Badge variant="warning"><MailWarning size={10} /> Unverified</Badge>}
                  {!u.isActive && <Badge variant="danger">Suspended</Badge>}
                  <Badge variant={u.role === 'employer' ? 'info' : u.role === 'admin' ? 'brand' : 'neutral'}>
                    {u.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent admin activity" icon={ShieldAlert}
               action={<Button variant="ghost" className="h-8 text-xs" onClick={() => navigate('/admin/audit')}>Full log</Button>}
               empty={audit.length === 0 ? 'No moderation actions recorded yet.' : null}>
          <div className="flex flex-col gap-2">
            {audit.map((a) => (
              <div key={a._id} className="flex items-start gap-2.5 py-1.5 border-b border-border-subtle last:border-0">
                <Badge variant="neutral" className="shrink-0 mt-0.5">{a.action.replace(/_/g, ' ').toLowerCase()}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{a.details}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{a.actor?.name || 'Unknown'} · {ago(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
