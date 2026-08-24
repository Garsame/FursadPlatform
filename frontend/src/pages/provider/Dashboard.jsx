import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Plus, Briefcase, Users, CalendarCheck, Award, Target, TrendingUp, MapPin,
  Sparkles, AlertTriangle, Clock, ArrowRight, Building2, Inbox, ShieldCheck,
} from 'lucide-react';

const STATUS_VARIANT = {
  applied: 'neutral', reviewed: 'info', shortlisted: 'brand',
  interview: 'warning', offer: 'success', hired: 'success', rejected: 'danger',
};

const JOB_STATUS = {
  published: { label: 'Live', variant: 'success' },
  pending_review: { label: 'Awaiting approval', variant: 'warning' },
  flagged: { label: 'Not approved', variant: 'danger' },
  closed: { label: 'Closed', variant: 'neutral' },
  draft: { label: 'Draft', variant: 'neutral' },
};

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

const scoreTone = (n) =>
  n === null ? 'text-text-muted'
    : n >= 75 ? 'text-success'
    : n >= 50 ? 'text-brand-deep'
    : 'text-accent-ochreInk';

/* ------------------------------------------------------------------ bits */

const Stat = ({ icon: Icon, label, value, sub, tone = 'neutral', onClick }) => {
  const tones = { neutral: 'text-text-primary', brand: 'text-brand-deep', good: 'text-success', warn: 'text-accent-ochreInk' };
  return (
    <Card hoverEffect={!!onClick} onClick={onClick} className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
        <Icon size={13} /> {label}
      </span>
      <span className={`text-3xl font-extrabold mt-1 tabular-nums ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted leading-snug">{sub}</span>}
    </Card>
  );
};

const BarRow = ({ label, value, max, right, color = 'bg-brand-green' }) => (
  <div className="flex items-center gap-3">
    <span className="w-28 shrink-0 text-xs text-text-secondary truncate" title={label}>{label}</span>
    <div className="flex-1 h-6 bg-bg-elevated rounded-btn overflow-hidden">
      <div className={`h-full ${color} rounded-btn transition-all duration-500`}
           style={{ width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0}%` }} />
    </div>
    <span className="w-16 shrink-0 text-xs font-semibold text-text-primary text-right tabular-nums">
      {right ?? value}
    </span>
  </div>
);

/** Applications received per month, drawn as columns. */
const Columns = ({ points }) => {
  const max = Math.max(...points.map((p) => p.count), 1);
  return (
    <div className="flex items-end gap-3 h-40">
      {points.map((p) => (
        <div key={p.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <span className="text-xs font-semibold text-text-primary tabular-nums">{p.count}</span>
          <div className="w-full bg-brand-green rounded-t-btn transition-all duration-500 min-h-[3px]"
               style={{ height: `${(p.count / max) * 100}%` }} />
          <span className="text-[11px] text-text-muted">{p.month}</span>
        </div>
      ))}
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
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/companies/mine/analytics');
        if (res.data?.success) setD(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load your dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  if (error || !d) {
    return <Card className="text-center py-12 text-text-secondary">{error || 'No data.'}</Card>;
  }

  const { company, summary: s, funnel, applicationsOverTime, matchDistribution, perJob,
    applicantCities, applicantSkills, recentApplicants } = d;

  const funnelMax = funnel[0]?.count || 1;
  const matchMax = Math.max(...matchDistribution.map((b) => b.count), 1);
  const noApplicantsYet = s.totalApplicants === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Heading */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold text-text-primary flex items-center gap-2.5">
            {company.name}
            {company.isVerified && <Badge variant="info"><ShieldCheck size={11} /> Verified</Badge>}
          </h1>
          <p className="text-text-secondary mt-1.5">
            How your hiring is going — every figure here counts only your own vacancies.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => navigate('/provider/jobs/new')}>
          <Plus size={18} /> Post a job
        </Button>
      </div>

      {/* Anything blocking them comes first */}
      {!company.canPostJobs && (
        <Card className="border-accent-ochre/45 bg-accent-ochreMuted flex flex-col gap-3">
          <h3 className="font-bold text-accent-ochreInk flex items-center gap-2">
            <Building2 size={17} /> Finish your company profile before posting
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed max-w-prose">
            Candidates read your profile before they trust you with a CV. These are still missing:
          </p>
          <ul className="flex flex-col gap-1.5">
            {company.missingEssentials.map((m) => (
              <li key={m.key} className="text-sm text-text-secondary">
                <span className="font-semibold text-accent-ochreInk">{m.label}</span> — {m.hint}
              </li>
            ))}
          </ul>
          <Button variant="deep" className="self-start mt-1" onClick={() => navigate('/provider/company')}>
            Complete profile ({company.profileCompleteness}%) <ArrowRight size={14} />
          </Button>
        </Card>
      )}

      {s.pendingApproval > 0 && (
        <Card className="border-brand-green/40 bg-brand-muted flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-deep flex items-center gap-2">
            <Clock size={16} />
            <span>
              <strong>{s.pendingApproval} job{s.pendingApproval === 1 ? '' : 's'}</strong> waiting for
              administrator approval. You will be emailed as soon as a decision is made.
            </span>
          </p>
          <Button variant="secondary" className="h-9 text-xs" onClick={() => navigate('/provider/jobs')}>
            View my jobs
          </Button>
        </Card>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Briefcase} label="Live jobs" value={s.liveJobs} tone="brand"
              sub={`${s.totalJobs} posted in total${s.pendingApproval ? ` · ${s.pendingApproval} awaiting approval` : ''}`}
              onClick={() => navigate('/provider/jobs')} />
        <Stat icon={Users} label="Applicants" value={s.totalApplicants}
              sub={`${s.newApplicants7} this week · ${s.avgApplicantsPerJob} per job`} />
        <Stat icon={Inbox} label="Not yet reviewed" value={s.needsReview}
              tone={s.needsReview > 0 ? 'warn' : 'good'}
              sub={s.needsReview > 0 ? 'Waiting on you' : 'You are up to date'} />
        <Stat icon={Target} label="Avg match score"
              value={s.avgMatchScore === null ? '—' : `${s.avgMatchScore}%`}
              sub={s.bestMatchScore ? `best so far ${s.bestMatchScore}%` : 'no scored applicants yet'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label="Shortlisted" value={funnel[2].count}
              sub={`${funnel[1].count} reviewed of ${s.totalApplicants}`} />
        <Stat icon={CalendarCheck} label="At interview" value={s.interviews}
              sub={s.offers > 0 ? `${s.offers} offer(s) out` : 'no offers out yet'} />
        <Stat icon={Award} label="Hired" value={s.hires} tone={s.hires > 0 ? 'good' : 'neutral'}
              sub={s.rejected > 0 ? `${s.rejected} rejected` : 'nobody rejected yet'} />
        <Stat icon={Sparkles} label="Avg job quality"
              value={s.avgJobQuality === null ? '—' : `${s.avgJobQuality}%`}
              sub="How the automatic screen rates your postings" />
      </div>

      {/* Applications over time + funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Applications received" icon={TrendingUp}>
          <Columns points={applicationsOverTime} />
          <p className="text-[11px] text-text-muted">Per month, across all your vacancies.</p>
        </Panel>

        <Panel title="Your hiring funnel" icon={Users}
               empty={noApplicantsYet ? 'No applications yet.' : null}>
          <div className="flex flex-col gap-2.5">
            {funnel.map((f) => (
              <BarRow key={f.stage} label={f.stage} value={f.count} max={funnelMax}
                      right={`${f.count}`}
                      color={f.stage === 'Hired' ? 'bg-success' : 'bg-brand-deep'} />
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            Where candidates stop. A wide gap between two stages is usually where your process stalls.
          </p>
        </Panel>
      </div>

      {/* Per-job performance — the table an employer actually reads */}
      <Panel
        title="How each job is performing"
        icon={Briefcase}
        action={<Button variant="ghost" className="h-8 text-xs" onClick={() => navigate('/provider/jobs')}>Manage all</Button>}
        empty={perJob.length === 0 ? 'You have not posted a job yet.' : null}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border-subtle">
                <th className="pb-2.5 font-semibold">Role</th>
                <th className="pb-2.5 font-semibold">Status</th>
                <th className="pb-2.5 font-semibold text-right">Applicants</th>
                <th className="pb-2.5 font-semibold text-right">Shortlisted</th>
                <th className="pb-2.5 font-semibold text-right">Avg match</th>
                <th className="pb-2.5 font-semibold text-right">Best</th>
                <th className="pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {perJob.map((j) => {
                const meta = JOB_STATUS[j.status] || { label: j.status, variant: 'neutral' };
                return (
                  <tr key={j._id} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/40">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-text-primary">{j.title}</p>
                      <p className="text-[11px] text-text-muted">
                        {j.city || '—'} · {j.employmentType}
                        {j.aiQualityFlags.length > 0 && (
                          <span className="text-accent-ochreInk"> · {j.aiQualityFlags.length} quality flag(s)</span>
                        )}
                      </p>
                    </td>
                    <td className="py-3 pr-3"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums text-text-primary">{j.applicants}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-text-secondary">{j.shortlisted}</td>
                    <td className={`py-3 pr-3 text-right font-semibold tabular-nums ${scoreTone(j.avgScore)}`}>
                      {j.avgScore === null ? '—' : `${j.avgScore}%`}
                    </td>
                    <td className={`py-3 pr-3 text-right tabular-nums ${scoreTone(j.bestScore)}`}>
                      {j.bestScore === null ? '—' : `${j.bestScore}%`}
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" className="h-8 text-xs"
                              onClick={() => navigate(`/provider/jobs/${j._id}/applicants`)}>
                        View →
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Quality of interest */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="How well applicants match" icon={Target}
               empty={noApplicantsYet ? 'No scored applicants yet.' : null}>
          <div className="flex flex-col gap-2.5">
            {matchDistribution.map((b) => (
              <BarRow key={b.band} label={b.band} value={b.count} max={matchMax}
                      color={b.band === 'Under 40%' ? 'bg-danger/70' : 'bg-brand-green'} />
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            Mostly low scores usually means the job description is asking for the wrong things,
            or is too vague for the matching engine to work with.
          </p>
        </Panel>

        <Panel title="Where your applicants are" icon={MapPin}
               empty={applicantCities.length === 0 ? 'No applicant has set a city yet.' : null}>
          <div className="flex flex-col gap-2.5">
            {applicantCities.map((c) => (
              <BarRow key={c.city} label={c.city} value={c.count}
                      max={Math.max(...applicantCities.map((x) => x.count), 1)}
                      color="bg-brand-deep" />
            ))}
          </div>
        </Panel>
      </div>

      {/* Skills + recent people */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Skills in your applicant pool" icon={Sparkles}
               empty={applicantSkills.length === 0 ? 'No applicant has listed a skill yet.' : null}>
          <div className="flex flex-wrap gap-2">
            {applicantSkills.map((sk) => (
              <span key={sk.skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-brand-muted
                      border border-brand-green/30 text-xs font-semibold text-brand-deep capitalize">
                {sk.skill}
                <span className="text-[10px] text-text-muted tabular-nums">{sk.count}</span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            What the people applying to you actually know — useful for judging whether you are
            reaching the right candidates.
          </p>
        </Panel>

        <Panel title="Latest applicants" icon={Users}
               empty={recentApplicants.length === 0 ? 'Nobody has applied yet.' : null}>
          <div className="flex flex-col gap-2">
            {recentApplicants.map((a) => (
              <div key={a._id}
                   className="flex items-center justify-between gap-3 py-2 border-b border-border-subtle last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{a.name}</p>
                  <p className="text-xs text-text-muted truncate">
                    {a.jobTitle}{a.city ? ` · ${a.city}` : ''} · {ago(a.appliedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold tabular-nums ${scoreTone(a.matchScore)}`}>
                    {a.matchScore}%
                  </span>
                  <Badge variant={STATUS_VARIANT[a.status] || 'neutral'} className="capitalize">
                    {a.status}
                  </Badge>
                  <Button variant="ghost" className="h-8 text-xs"
                          onClick={() => navigate(`/provider/jobs/${a.jobId}/applicants`)}>
                    Open
                  </Button>
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
