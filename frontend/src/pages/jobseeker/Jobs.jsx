import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Sparkles, LayoutGrid, FileStack, ChevronDown, Target, AlertCircle, CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import JobCard from '../../components/JobCard';
import CompanyLogo from '../../components/CompanyLogo';

const WEIGHTS = { skills: 45, location: 20, salary: 15, education: 10, experience: 10 };

const Jobs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // ?cv=<id> deep-links straight into the matched tab for that CV.
  const cvParam = params.get('cv');
  const [tab, setTab] = useState(cvParam ? 'matched' : 'all');

  const [allJobs, setAllJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [basis, setBasis] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [allCvs, setAllCvs] = useState([]);
  const [source, setSource] = useState(cvParam || 'profile');
  const [applied, setApplied] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [matchError, setMatchError] = useState('');
  const [filter, setFilter] = useState('');

  // Apply modal
  const [applyFor, setApplyFor] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [applyCv, setApplyCv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // ------------------------------------------------------------- loaders
  useEffect(() => {
    (async () => {
      const [jobsRes, cvsRes, appsRes] = await Promise.allSettled([
        api.get('/jobs'),
        api.get('/cvs'),
        api.get('/applications/mine'),
      ]);
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.success) {
        setAllJobs(jobsRes.value.data.data);
      }
      if (cvsRes.status === 'fulfilled' && cvsRes.value.data?.success) {
        // Only analysed CVs can drive matching, but any CV can be *sent* with
        // an application — a CV that failed to parse is still the document the
        // employer wants to read, and it must not block applying.
        setAllCvs(cvsRes.value.data.data);
        setCvs(cvsRes.value.data.data.filter((c) => c.parseStatus === 'parsed'));
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.data?.success) {
        setApplied(new Set(appsRes.value.data.data.map((a) => a.job?._id).filter(Boolean)));
      }
      setLoading(false);
    })();
  }, []);

  const loadMatches = useCallback(async () => {
    setMatchError('');
    try {
      const qs = source && source !== 'profile' ? `?cvId=${source}` : '';
      const res = await api.get(`/profile/recommendations${qs}`);
      if (res.data?.success) {
        setMatches(res.data.data);
        setBasis(res.data.basis);
      }
    } catch (err) {
      setMatches([]);
      setMatchError(err.response?.data?.message || 'Could not load your matches.');
    }
  }, [source]);

  useEffect(() => {
    if (tab === 'matched') loadMatches();
  }, [tab, loadMatches]);

  const switchSource = (value) => {
    setSource(value);
    const p = new URLSearchParams(params);
    if (value === 'profile') p.delete('cv'); else p.set('cv', value);
    setParams(p, { replace: true });
  };

  // ------------------------------------------------------------- applying
  const openApply = (job) => {
    setApplyFor(job);
    setCoverNote('');
    setApplyError('');
    setApplySuccess(false);
    // Default to the CV currently driving the matches, else the primary one.
    setApplyCv(
      source !== 'profile'
        ? source
        : (allCvs.find((c) => c.isPrimary) || allCvs[0])?._id || ''
    );
  };

  const submitApply = async (e) => {
    e.preventDefault();
    if (!applyCv) {
      setApplyError('Please choose which CV to send with this application.');
      return;
    }
    setSubmitting(true);
    setApplyError('');
    try {
      const res = await api.post('/applications', {
        jobId: applyFor._id,
        coverNote,
        cvId: applyCv,
      });
      if (res.data?.success) {
        setApplySuccess(true);
        setApplied((prev) => new Set(prev).add(applyFor._id));
        setTimeout(() => setApplyFor(null), 1400);
      }
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------- filtering
  const term = filter.trim().toLowerCase();
  const matchText = (job) =>
    !term ||
    job.title.toLowerCase().includes(term) ||
    (job.company?.name || '').toLowerCase().includes(term) ||
    (job.location?.city || '').toLowerCase().includes(term);

  const visibleAll = allJobs.filter(matchText);
  const visibleMatches = matches.filter((m) => matchText(m.job));

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-text-primary">{t('nav.jobs')}</h1>
        <p className="text-text-secondary mt-1.5">
          {tab === 'all' ? t('seekerjobs.all_sub') : t('seekerjobs.matched_sub')}
        </p>
      </header>

      {/* -------------------------------------------------------- Tabs */}
      <div className="flex items-center gap-1 p-1 bg-bg-elevated rounded-btn w-fit mb-6">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} icon={LayoutGrid}>
          {t('seekerjobs.tab_all')}
          <span className="ml-1.5 text-xs opacity-70">{allJobs.length}</span>
        </TabButton>
        <TabButton active={tab === 'matched'} onClick={() => setTab('matched')} icon={Sparkles}>
          {t('seekerjobs.tab_matched')}
        </TabButton>
      </div>

      {/* ---------------------------------------------- Matched controls */}
      {tab === 'matched' && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="text-sm font-semibold text-text-primary">{t('seekerjobs.matched_by')}</label>
          <div className="relative">
            <select
              value={source}
              onChange={(e) => switchSource(e.target.value)}
              className="h-10 pl-4 pr-9 rounded-btn bg-bg-surface border border-border-subtle text-sm
                font-medium text-text-primary appearance-none cursor-pointer
                hover:border-border-strong focus:outline-none focus:border-brand-green"
            >
              <option value="profile">{t('seekerjobs.use_profile')}</option>
              {cvs.map((cv) => (
                <option key={cv._id} value={cv._id}>
                  {cv.label}{cv.isPrimary ? ' ★' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {basis?.type === 'cv' && (
            <Badge variant="brand"><FileStack size={11} /> {basis.cvLabel}</Badge>
          )}
        </div>
      )}

      {/* --------------------------------------------------- Local filter */}
      <div className="relative max-w-sm mb-6">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('seekerjobs.search_ph')}
          className="w-full h-10 pl-10 pr-4 bg-bg-surface border border-border-subtle rounded-input
            text-sm text-text-primary placeholder:text-text-muted focus:outline-none
            focus:border-brand-green focus:ring-4 focus:ring-brand-green/18 transition-all"
        />
      </div>

      {/* -------------------------------------------------------- Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-card bg-bg-elevated animate-pulse" />
          ))}
        </div>
      ) : tab === 'all' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleAll.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      ) : cvs.length === 0 && source === 'profile' && matches.length === 0 && matchError ? (
        <NoCvs t={t} navigate={navigate} message={matchError} />
      ) : (
        <div className="flex flex-col gap-4">
          {visibleMatches.map(({ job, score, breakdown }) => (
            <MatchRow
              key={job._id}
              job={job}
              score={score}
              breakdown={breakdown}
              alreadyApplied={applied.has(job._id)}
              onApply={() => openApply(job)}
              t={t}
            />
          ))}
          {visibleMatches.length === 0 && !matchError && (
            <p className="text-sm text-text-secondary py-8 text-center">No matches to show.</p>
          )}
          {matchError && <NoCvs t={t} navigate={navigate} message={matchError} />}
        </div>
      )}

      {/* --------------------------------------------------- Apply modal */}
      <Modal
        isOpen={!!applyFor}
        onClose={() => setApplyFor(null)}
        title={applySuccess ? t('jobdetail.applied_title') : t('jobdetail.apply_to', { title: applyFor?.title || '' })}
        subtitle={applySuccess ? '' : applyFor?.company?.name}
      >
        {applySuccess ? (
          <div className="text-center py-6">
            <span className="w-14 h-14 rounded-full bg-brand-muted grid place-items-center mx-auto">
              <CheckCircle2 size={28} className="text-success" />
            </span>
            <p className="text-text-secondary mt-4">{t('jobdetail.applied_sub')}</p>
          </div>
        ) : (
          <form onSubmit={submitApply}>
            {allCvs.length > 0 ? (
              <>
                <label className="text-sm font-semibold text-text-primary">
                  Which CV should we send? <span className="text-danger">*</span>
                </label>
                <select
                  value={applyCv}
                  onChange={(e) => setApplyCv(e.target.value)}
                  required
                  className="w-full h-input px-4 mt-1.5 mb-5 bg-bg-primary border border-border-subtle rounded-input
                    text-text-primary focus:outline-none focus:border-brand-green"
                >
                  {allCvs.map((cv) => (
                    <option key={cv._id} value={cv._id}>
                      {cv.label}{cv.parseStatus !== 'parsed' ? ' (not analysed)' : ''}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="mb-5 p-4 rounded-input bg-bg-elevated border border-border-subtle text-center">
                <p className="text-sm text-text-secondary">
                  Every application is sent with a CV. Upload one to apply.
                </p>
                <Button variant="primary" className="mt-3" onClick={() => navigate('/dashboard/cvs')}>
                  Upload a CV
                </Button>
              </div>
            )}

            <label htmlFor="note" className="text-sm font-semibold text-text-primary">
              {t('jobdetail.cover_label')}
            </label>
            <p className="text-xs text-text-muted mt-1 mb-3">{t('jobdetail.cover_hint')}</p>
            <textarea
              id="note"
              rows={5}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder={t('jobdetail.cover_placeholder')}
              className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-input
                text-text-primary placeholder:text-text-muted resize-none focus:outline-none
                focus:border-brand-green focus:ring-4 focus:ring-brand-green/18 transition-all"
            />

            {applyError && (
              <p className="flex items-center gap-2 text-sm text-danger mt-3">
                <AlertCircle size={15} /> {applyError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" fullWidth onClick={() => setApplyFor(null)}>
                {t('jobdetail.cancel')}
              </Button>
              <Button type="submit" variant="primary" fullWidth disabled={submitting || !applyCv}>
                {submitting ? t('jobdetail.submitting') : t('jobdetail.submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 h-9 px-4 rounded-[7px] text-sm font-semibold transition-all ${
      active ? 'bg-bg-surface text-brand-deep shadow-card' : 'text-text-secondary hover:text-text-primary'
    }`}
  >
    <Icon size={16} /> {children}
  </button>
);

const NoCvs = ({ t, navigate, message }) => (
  <div className="text-center py-2xl border border-dashed border-border-strong rounded-card bg-bg-surface">
    <span className="w-16 h-16 rounded-2xl bg-brand-muted grid place-items-center mx-auto">
      <FileStack size={26} className="text-brand-deep" />
    </span>
    <h3 className="font-bold text-lg text-text-primary mt-5">{t('seekerjobs.no_cvs_title')}</h3>
    <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">{message || t('seekerjobs.no_cvs_sub')}</p>
    <Button variant="primary" className="mt-6" onClick={() => navigate('/dashboard/cvs')}>
      {t('seekerjobs.no_cvs_cta')}
    </Button>
  </div>
);

/** A match row shows the score AND why it scored that way — the transparency is
 *  the whole point of the matching engine. */
const MatchRow = ({ job, score, breakdown, alreadyApplied, onApply, t }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-5">
    <div className="flex flex-wrap items-start gap-4">
      <CompanyLogo name={job.company?.name} logoUrl={job.company?.logoUrl} size="md" />

      <div className="min-w-0 flex-1">
        <Link to={`/jobs/${job._id}`} className="font-bold text-text-primary hover:text-brand-deep transition-colors">
          {job.title}
        </Link>
        <p className="text-sm text-text-secondary mt-0.5">
          {job.company?.name} · {[job.location?.city, job.location?.country].filter(Boolean).join(', ')}
        </p>
      </div>

      <div className="text-right shrink-0">
        <div className={`text-2xl font-extrabold leading-none ${
          score >= 80 ? 'text-success' : score >= 55 ? 'text-brand-deep' : 'text-text-muted'
        }`}>{score}%</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mt-1">
          {t('dashboard.match_score')}
        </div>
      </div>
    </div>

    {/* Weighted breakdown */}
    <div className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2.5">
        {t('seekerjobs.score_breakdown')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(WEIGHTS).map(([key, weight]) => (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[11px] font-medium text-text-secondary">{t(`seekerjobs.${key}`)}</span>
              <span className="text-[11px] font-bold text-text-primary">{breakdown?.[key] ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (breakdown?.[key] ?? 0) >= 70 ? 'bg-brand-green'
                  : (breakdown?.[key] ?? 0) >= 40 ? 'bg-accent-ochre' : 'bg-border-strong'
                }`}
                style={{ width: `${breakdown?.[key] ?? 0}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted">{weight}% weight</span>
          </div>
        ))}
      </div>
    </div>

    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border-subtle">
      <Link to={`/jobs/${job._id}`}>
        <Button size="sm" variant="secondary">{t('jobdetail.about_role')}</Button>
      </Link>
      {alreadyApplied ? (
        <Badge variant="success" className="ml-auto"><CheckCircle2 size={12} /> {t('seekerjobs.applied')}</Badge>
      ) : (
        <Button size="sm" variant="primary" className="ml-auto" onClick={onApply}>
          <Target size={15} /> {t('seekerjobs.apply')}
        </Button>
      )}
    </div>
  </div>
);

export default Jobs;
