import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, MapPin, ArrowRight, Sparkles, FileText, Target, Send,
  MessageSquare, Trophy, ShieldCheck, Languages, BadgeDollarSign,
  Plus, Minus, Building2, Briefcase, ArrowRightLeft,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import JobCard from '../../components/JobCard';
import CompanyLogo from '../../components/CompanyLogo';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    (async () => {
      const [jobsRes, cosRes] = await Promise.allSettled([
        api.get('/jobs'),
        api.get('/companies'),
      ]);
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.success) {
        setJobs(jobsRes.value.data.data);
      }
      // Employers with live jobs — real profiles candidates can open and read.
      if (cosRes.status === 'fulfilled' && cosRes.value.data?.success) {
        setCompanies(cosRes.value.data.data);
      }
      setLoading(false);
    })();
  }, []);

  const runSearch = (overrides = {}) => {
    const params = new URLSearchParams();
    const term = overrides.q ?? q;
    const place = overrides.city ?? city;
    if (term.trim()) params.set('search', term.trim());
    if (place.trim()) params.set('city', place.trim());
    navigate(`/jobs${params.toString() ? `?${params}` : ''}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch();
  };

  const cities = [...new Set(jobs.map((j) => j.location?.city).filter(Boolean))];

  return (
    <>
      {/* ============================================================ HERO */}
      {/*
        Centred rather than split two-up. The search field is the one thing
        every visitor came to use, so it sits on the page's centre line where
        the eye lands, and the product itself — not a stock photograph —
        carries the visual weight underneath it.

        The height is pinned to one viewport on desktop so the hero resolves
        without scrolling; below lg it flows naturally, because forcing a
        screen height on a phone only creates dead space.
      */}
      <section className="relative overflow-hidden lg:min-h-[calc(100vh-72px)] flex items-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-muted via-bg-primary to-bg-primary" />
        <div className="absolute -top-48 -right-40 -z-10 w-[40rem] h-[40rem] rounded-full bg-accent-ochreMuted blur-3xl opacity-70" />
        <div className="absolute -bottom-56 -left-40 -z-10 w-[36rem] h-[36rem] rounded-full bg-brand-muted blur-3xl" />

        <div className="w-full max-w-7xl mx-auto px-6 py-lg lg:py-md">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <span className="eyebrow justify-center">
              <Sparkles size={14} />
              {t('home.eyebrow')}
            </span>

            <h1 className="font-display text-[2.5rem] sm:text-[3.4rem] lg:text-[3.9rem] font-semibold leading-[1.04] text-text-primary mt-5">
              {t('home.hero_title_a')}{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-brand-deep">{t('home.hero_title_em')}</span>
                <span className="absolute left-0 right-0 bottom-1.5 h-3.5 bg-brand-green/30 -z-0 rounded-sm" />
              </span>{' '}
              {t('home.hero_title_b')}
            </h1>

            <p className="text-lg text-text-secondary mt-5 mx-auto max-w-2xl leading-relaxed">
              {t('home.hero_sub')}
            </p>
          </div>

          {/* ---- Search ---- */}
          <form
            onSubmit={handleSearch}
            className="mt-8 mx-auto max-w-3xl bg-bg-surface border border-border-subtle rounded-[18px]
              shadow-lift p-2 flex flex-col sm:flex-row gap-2 animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="relative flex-1 min-w-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('home.search_role')}
                aria-label={t('home.search_role')}
                className="w-full h-[52px] pl-11 pr-3 bg-transparent rounded-input text-text-primary
                  placeholder:text-text-muted focus:outline-none"
              />
            </div>

            {/* A real divider rather than a border on the input, so it reads as
                one control split in two rather than two stacked boxes. */}
            <span className="hidden sm:block w-px my-2 bg-border-subtle" aria-hidden="true" />

            <div className="relative flex-1 min-w-0 sm:max-w-[14rem]">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="hero-cities"
                placeholder={t('home.search_city')}
                aria-label={t('home.search_city')}
                className="w-full h-[52px] pl-11 pr-3 bg-transparent rounded-input text-text-primary
                  placeholder:text-text-muted focus:outline-none"
              />
              <datalist id="hero-cities">
                {cities.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <Button type="submit" variant="primary" size="lg" className="sm:w-auto shrink-0">
              <Search size={17} />
              {t('home.search_btn')}
            </Button>
          </form>

          {/* Popular cities, taken from the vacancies that are actually live —
              a shortcut that cannot advertise a city with nothing in it. */}
          {cities.length > 0 && (
            <div
              className="mt-4 flex flex-wrap items-center justify-center gap-2 animate-fade-up"
              style={{ animationDelay: '140ms' }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted mr-1">
                {t('home.hero_popular')}
              </span>
              {cities.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCity(c); runSearch({ city: c }); }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-pill text-xs font-semibold
                    bg-bg-surface border border-border-subtle text-text-secondary
                    hover:border-brand-green/50 hover:text-brand-deep hover:shadow-card transition-all"
                >
                  <MapPin size={12} /> {c}
                </button>
              ))}
            </div>
          )}

          <p
            className="mt-5 text-center text-sm text-text-muted animate-fade-up"
            style={{ animationDelay: '200ms' }}
          >
            {t('home.hero_trust')}
          </p>

          {/* ---- The product, standing in for a photograph ---- */}
          <div className="mt-10 lg:mt-md animate-fade-up" style={{ animationDelay: '260ms' }}>
            <MatchPreview t={t} />
          </div>
        </div>
      </section>

      {/* ================================================== HIRING NOW */}
      {companies.length > 0 && <EmployerWall companies={companies} t={t} />}

      {/* ================================================== HOW IT WORKS */}
      <HowItWorks t={t} />

      {/* ====================================================== JOBS GRID */}
      <section className="section">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <span className="eyebrow">{t('home.jobs_eyebrow')}</span>
            <div className="rule-ochre mt-3 mb-4" />
            <h2 className="font-display text-4xl font-semibold text-text-primary">
              {t('home.jobs_title')}
            </h2>
            <p className="text-text-secondary mt-2 max-w-prose">{t('home.jobs_sub')}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/jobs')}>
            {t('home.see_all')} <ArrowRight size={16} />
          </Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-card bg-bg-elevated animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyJobs t={t} />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.slice(0, 6).map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
            {jobs.length > 6 && (
              <div className="flex justify-center mt-10">
                <Button variant="deep" size="lg" onClick={() => navigate('/jobs')}>
                  {t('home.see_more_count', { count: jobs.length })} <ArrowRight size={17} />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ==================================================== WHY JOBASSISTAI */}
      <section className="bg-bg-surface border-y border-border-subtle">
        <div className="section">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="eyebrow justify-center">{t('home.why_eyebrow')}</span>
            <div className="rule-ochre mt-3 mb-4 mx-auto" />
            <h2 className="font-display text-4xl font-semibold text-text-primary leading-tight">
              {t('home.why_title')}
            </h2>
            <p className="text-text-secondary mt-4 leading-relaxed">{t('home.why_sub')}</p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <ValueProp
              index={1} icon={Target}
              title={t('home.why_1_t')} body={t('home.why_1_d')} meta={t('home.why_1_m')}
            />
            <ValueProp
              index={2} icon={BadgeDollarSign}
              title={t('home.why_2_t')} body={t('home.why_2_d')} meta={t('home.why_2_m')}
            />
            <ValueProp
              index={3} icon={ShieldCheck}
              title={t('home.why_3_t')} body={t('home.why_3_d')} meta={t('home.why_3_m')}
            />
            <ValueProp
              index={4} icon={Languages}
              title={t('home.why_4_t')} body={t('home.why_4_d')} meta={t('home.why_4_m')}
            />
          </div>
        </div>
      </section>

      {/* ================================================ EMPLOYER BAND */}
      <section className="section">
        <div className="relative overflow-hidden rounded-[26px] bg-bg-deep text-text-inverse px-8 py-14 sm:px-14">
          <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-brand-green/15 blur-3xl" />
          <div className="absolute -left-16 -bottom-24 w-80 h-80 rounded-full bg-accent-ochre/15 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre">
                <Building2 size={14} /> {t('home.emp_eyebrow')}
              </span>
              <h2 className="font-display text-4xl font-semibold mt-4 leading-tight">
                {t('home.emp_title')}
              </h2>
              <p className="text-text-onDeepDim mt-4 max-w-prose leading-relaxed">
                {t('home.emp_sub')}
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button variant="primary" size="lg" onClick={() => navigate('/provider/signup')}>
                  {t('home.emp_cta')} <ArrowRight size={17} />
                </Button>
                <Button variant="onDeep" size="lg" onClick={() => navigate('/provider/login')}>
                  {t('home.emp_signin')}
                </Button>
              </div>
            </div>

            <ul className="grid sm:grid-cols-2 gap-4">
              {[
                t('home.emp_p1'), t('home.emp_p2'),
                t('home.emp_p3'), t('home.emp_p4'),
              ].map((p) => (
                <li key={p} className="flex gap-3 bg-white/8 border border-border-onDeep rounded-xl p-4">
                  <Sparkles size={17} className="text-brand-green shrink-0 mt-0.5" />
                  <span className="text-sm text-text-inverse/90 leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================================ FAQ */}
      <Faq t={t} />
    </>
  );
};

/* ==================================================================== */
/*  The hero visual — the product, not a photograph                     */
/* ==================================================================== */

/**
 * A worked example of the thing JobAssistAI actually does: one candidate, one
 * vacancy, and the arithmetic between them.
 *
 * It replaced two stock photographs of strangers in an office, which said
 * nothing about the product and — being remote images — went blank whenever
 * the connection did. This renders from the design tokens, so it is offline-
 * safe and cannot drift away from the rest of the page.
 *
 * The score is COMPUTED from the factors below using the engine's own
 * weights, exactly as the server does it. Nothing here is a typed-in number:
 * a page that argues the scoring is honest cannot itself display a decorative
 * one, which is the mistake the old floating "96%" card made.
 */
const WEIGHTS = { skills: 45, location: 20, salary: 15, education: 10, experience: 10 };

const SAMPLE = [
  { key: 'skills',     value: 92 },
  { key: 'location',   value: 100 },
  { key: 'salary',     value: 100 },
  { key: 'education',  value: 100 },
  { key: 'experience', value: 60 },
];

const SAMPLE_SCORE = Math.round(
  SAMPLE.reduce((sum, f) => sum + f.value * WEIGHTS[f.key], 0) / 100
);

const MatchPreview = ({ t }) => {
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="absolute inset-x-8 -bottom-3 h-10 bg-brand-deep/10 blur-2xl rounded-full" aria-hidden="true" />

      <div className="relative bg-bg-surface border border-border-subtle rounded-[22px] shadow-deep overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-border-subtle bg-bg-primary">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
            <Sparkles size={13} className="text-brand-deep" />
            {t('home.mp_title')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            {t('home.mp_computed')}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          {/* Candidate → score → role */}
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 sm:gap-5 items-center">
            {/* Candidate */}
            <article className="rounded-card border border-border-subtle bg-bg-primary p-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                {t('home.mp_candidate')}
              </span>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="w-11 h-11 rounded-xl bg-brand-deep text-white grid place-items-center font-bold text-sm shrink-0">
                  AY
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-text-primary text-sm truncate">Amina Y.</div>
                  <div className="text-[11px] text-text-muted truncate">Mogadishu · 4 yrs</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Node.js', 'MongoDB', 'Express', '+4'].map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-pill bg-brand-muted text-brand-deep text-[10px] font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </article>

            {/* Score */}
            <div className="flex sm:flex-col items-center justify-center gap-3 sm:gap-2 py-1">
              <ArrowRightLeft size={15} className="text-border-strong sm:hidden" />
              <div className="relative w-[80px] h-[80px] shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90" aria-hidden="true">
                  <circle cx="40" cy="40" r={R} fill="none" strokeWidth="7"
                    className="stroke-bg-elevated" />
                  <circle
                    cx="40" cy="40" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - SAMPLE_SCORE / 100)}
                    className="stroke-brand-green"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="font-display text-xl font-semibold text-brand-deep leading-none">
                    {SAMPLE_SCORE}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                {t('home.mp_match')}
              </span>
            </div>

            {/* Role */}
            <article className="rounded-card border border-border-subtle bg-bg-primary p-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                {t('home.mp_role')}
              </span>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="w-11 h-11 rounded-xl bg-accent-ochre text-brand-ink grid place-items-center shrink-0">
                  <Briefcase size={18} />
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-text-primary text-sm truncate">Backend Developer</div>
                  <div className="text-[11px] text-text-muted truncate">Mogadishu · full-time</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2 py-0.5 rounded-pill bg-accent-ochreMuted text-accent-ochreInk text-[10px] font-semibold">
                  $900 – $1,600
                </span>
                <span className="px-2 py-0.5 rounded-pill bg-bg-elevated text-text-secondary text-[10px] font-semibold">
                  Bachelor
                </span>
              </div>
            </article>
          </div>

          {/* The breakdown — this is the part that makes the number checkable */}
          <div className="mt-5 pt-5 border-t border-border-subtle">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
              {t('home.mp_why')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3 mt-3">
              {SAMPLE.map((f) => (
                <div key={f.key}>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] font-semibold text-text-secondary truncate">
                      {t(`home.f_${f.key}`)}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted shrink-0">
                      {WEIGHTS[f.key]}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-elevated mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${f.value >= 80 ? 'bg-brand-green' : 'bg-accent-ochre'}`}
                      style={{ width: `${f.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================================================================== */
/*  Employers hiring now                                                */
/* ==================================================================== */

/**
 * This used to be a bare strip of logos under a small grey label, floating
 * with no header and no explanation of what the reader was looking at. It is
 * now a section like any other — eyebrow, rule, heading, a sentence saying
 * why these particular employers are here — and each card ends on the one
 * fact that matters to a candidate: how many roles are actually open.
 */
const EmployerWall = ({ companies, t }) => (
  <section className="bg-bg-surface border-y border-border-subtle">
    <div className="section">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div className="max-w-2xl">
          <span className="eyebrow">
            <Building2 size={14} /> {t('home.trusted_eyebrow')}
          </span>
          <div className="rule-ochre mt-3 mb-4" />
          <h2 className="font-display text-4xl font-semibold text-text-primary leading-tight">
            {t('home.trusted_title')}
          </h2>
          <p className="text-text-secondary mt-3 leading-relaxed">
            {t('home.trusted_sub')}
          </p>
        </div>

        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep hover:gap-2.5 transition-all"
        >
          {t('home.trusted_all')} <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {companies.map((c) => (
          <Link
            key={c._id}
            to={`/companies/${c._id}`}
            className="group flex flex-col h-full p-5 rounded-card border border-border-subtle
              bg-bg-primary hover:border-brand-green/45 hover:shadow-lift
              hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start gap-3.5">
              {c.logoUrl ? (
                <img
                  src={`${API_ORIGIN}${c.logoUrl}`}
                  alt={`${c.name} logo`}
                  loading="lazy"
                  className="w-12 h-12 rounded-xl object-cover border border-border-subtle shrink-0"
                />
              ) : (
                <CompanyLogo name={c.name} size="md" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-text-primary truncate group-hover:text-brand-deep transition-colors">
                    {c.name}
                  </span>
                  {c.isVerified && (
                    <ShieldCheck size={14} className="text-success shrink-0" aria-label={t('home.verified')} />
                  )}
                </div>
                {c.industry && (
                  <p className="text-xs text-text-muted truncate mt-0.5">{c.industry}</p>
                )}
              </div>
            </div>

            {c.location?.city && (
              <p className="inline-flex items-center gap-1.5 text-xs text-text-muted mt-3">
                <MapPin size={12} /> {c.location.city}
              </p>
            )}

            {/* mt-auto pins the footer, so cards of different heights still
                line up along their most important row. */}
            <div className="flex items-center justify-between gap-2 mt-auto pt-4">
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-pill
                bg-brand-muted text-brand-deep text-[11px] font-bold">
                <Briefcase size={11} />
                {c.openRoles} {c.openRoles === 1 ? t('home.open_role') : t('home.open_roles')}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted
                group-hover:text-brand-deep group-hover:gap-1.5 transition-all">
                {t('home.view_profile')} <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

/* ==================================================================== */

/**
 * Each card carries a claim and, under a rule, the mechanism that makes the
 * claim true. The plain version stated four benefits any job board could
 * print; the number and the mechanism line are what turn them into something
 * specific to this product.
 */
const ValueProp = ({ icon: Icon, index, title, body, meta }) => (
  <article
    className="group relative flex flex-col h-full p-6 rounded-card bg-bg-primary
      border border-border-subtle hover:border-brand-green/45 hover:shadow-lift
      hover:-translate-y-0.5 transition-all duration-200"
  >
    <span
      className="absolute left-6 right-6 top-0 h-[3px] rounded-full bg-transparent
        group-hover:bg-brand-green/70 transition-colors duration-200"
      aria-hidden="true"
    />

    <div className="flex items-start justify-between gap-3">
      <span className="w-12 h-12 rounded-xl bg-brand-muted border border-brand-green/20 grid place-items-center shrink-0">
        <Icon size={21} className="text-brand-deep" />
      </span>
      <span
        className="font-display text-3xl font-semibold text-border-strong
          group-hover:text-brand-green/50 transition-colors duration-200 leading-none"
        aria-hidden="true"
      >
        {String(index).padStart(2, '0')}
      </span>
    </div>

    <h3 className="font-bold text-lg text-text-primary mt-5 leading-snug">{title}</h3>
    <p className="text-sm text-text-secondary mt-2 leading-relaxed flex-1">{body}</p>

    <p className="mt-5 pt-4 border-t border-border-subtle text-xs font-semibold text-accent-ochreInk leading-snug">
      {meta}
    </p>
  </article>
);

const EmptyJobs = ({ t }) => (
  <div className="text-center py-16 border border-dashed border-border-strong rounded-card bg-bg-surface">
    <span className="w-14 h-14 rounded-2xl bg-bg-elevated grid place-items-center mx-auto">
      <Search size={24} className="text-text-muted" />
    </span>
    <h3 className="font-bold text-text-primary mt-4">{t('home.no_jobs_title')}</h3>
    <p className="text-sm text-text-secondary mt-1.5">{t('home.no_jobs_sub')}</p>
  </div>
);

/**
 * How it works, as a real hierarchy: two lanes (candidate / employer) that
 * converge on the hire, with numbered steps on a connecting spine.
 */
const HowItWorks = ({ t }) => {
  const steps = [
    { icon: FileText,      title: t('home.step_1_t'), body: t('home.step_1_d') },
    { icon: Sparkles,      title: t('home.step_2_t'), body: t('home.step_2_d') },
    { icon: Target,        title: t('home.step_3_t'), body: t('home.step_3_d') },
    { icon: Send,          title: t('home.step_4_t'), body: t('home.step_4_d') },
    { icon: MessageSquare, title: t('home.step_5_t'), body: t('home.step_5_d') },
    { icon: Trophy,        title: t('home.step_6_t'), body: t('home.step_6_d') },
  ];

  return (
    <section className="section">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="eyebrow justify-center">{t('home.how_eyebrow')}</span>
        <div className="rule-ochre mt-3 mb-4 mx-auto" />
        <h2 className="font-display text-4xl sm:text-[2.75rem] font-semibold text-text-primary leading-tight">
          {t('home.how_title')}
        </h2>
        <p className="text-text-secondary mt-3">{t('home.how_sub')}</p>
      </div>

      <div className="relative">
        {/* The spine: a single vertical line the numbered steps hang off, so the
            sequence reads as one process rather than three loose cards. */}
        <div
          className="absolute left-[27px] md:left-1/2 md:-translate-x-px top-2 bottom-2 w-0.5
            bg-gradient-to-b from-brand-green via-border-strong to-accent-ochre md:block"
          aria-hidden="true"
        />

        <ol className="flex flex-col gap-8 md:gap-2">
          {steps.map((s, i) => {
            const left = i % 2 === 0;
            return (
              <li key={s.title} className="relative md:grid md:grid-cols-2 md:gap-12 items-center">
                {/* Node */}
                <span
                  className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-1 md:top-1/2 md:-translate-y-1/2
                    w-14 h-14 rounded-2xl bg-bg-surface border-2 border-border-subtle shadow-card
                    grid place-items-center z-10"
                >
                  <s.icon size={20} className="text-brand-deep" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-green text-brand-ink
                    text-[11px] font-extrabold grid place-items-center border-2 border-bg-primary">
                    {i + 1}
                  </span>
                </span>

                {/* Content, alternating sides on desktop */}
                <div
                  className={`pl-20 md:pl-0 md:py-6 ${
                    left ? 'md:col-start-1 md:text-right md:pr-14' : 'md:col-start-2 md:pl-14'
                  }`}
                >
                  <h3 className="font-bold text-lg text-text-primary">{s.title}</h3>
                  <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

const Faq = ({ t }) => {
  const [open, setOpen] = useState(0);
  const items = [
    { q: t('home.faq_1_q'), a: t('home.faq_1_a') },
    { q: t('home.faq_2_q'), a: t('home.faq_2_a') },
    { q: t('home.faq_3_q'), a: t('home.faq_3_a') },
    { q: t('home.faq_4_q'), a: t('home.faq_4_a') },
  ];

  return (
    <section className="section pt-0">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="eyebrow justify-center">{t('home.faq_eyebrow')}</span>
          <div className="rule-ochre mt-3 mb-4 mx-auto" />
          <h2 className="font-display text-4xl font-semibold text-text-primary">
            {t('home.faq_title')}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div
                key={it.q}
                className={`border rounded-card bg-bg-surface transition-all duration-200 ${
                  isOpen ? 'border-brand-green/45 shadow-card' : 'border-border-subtle'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
                >
                  <span className="font-semibold text-text-primary">{it.q}</span>
                  <span className="shrink-0 w-7 h-7 rounded-full bg-bg-elevated grid place-items-center">
                    {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 -mt-1 text-sm text-text-secondary leading-relaxed">
                    {it.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Home;
