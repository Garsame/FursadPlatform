import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, MapPin, ArrowRight, Sparkles, FileText, Target, Send,
  MessageSquare, Trophy, ShieldCheck, Languages, BadgeDollarSign,
  Plus, Minus, Building2,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import JobCard from '../../components/JobCard';
import CompanyLogo from '../../components/CompanyLogo';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const HERO_IMG =
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1100&q=80';
const HERO_IMG_2 =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';

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

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    if (city.trim()) params.set('city', city.trim());
    navigate(`/jobs${params.toString() ? `?${params}` : ''}`);
  };


  const cities = [...new Set(jobs.map((j) => j.location?.city).filter(Boolean))];

  return (
    <>
      {/* ============================================================ HERO */}
      <section className="relative overflow-hidden">
        {/* Soft evergreen wash behind the hero, fading into paper */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-muted via-bg-primary to-bg-primary" />
        <div className="absolute -top-40 -right-32 -z-10 w-[38rem] h-[38rem] rounded-full bg-accent-ochreMuted blur-3xl opacity-70" />

        <div className="max-w-7xl mx-auto px-6 pt-lg pb-2xl grid lg:grid-cols-[1.05fr_1fr] gap-xl items-center">
          {/* ---- Copy column ---- */}
          <div className="animate-fade-up">
            <span className="eyebrow">
              <Sparkles size={14} />
              {t('home.eyebrow')}
            </span>

            <h1 className="font-display text-[2.7rem] sm:text-6xl font-semibold leading-[1.05] text-text-primary mt-5">
              {t('home.hero_title_a')}{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-brand-deep">{t('home.hero_title_em')}</span>
                <span className="absolute left-0 right-0 bottom-1.5 h-3.5 bg-brand-green/30 -z-0 rounded-sm" />
              </span>{' '}
              {t('home.hero_title_b')}
            </h1>

            <p className="text-lg text-text-secondary mt-6 max-w-prose leading-relaxed">
              {t('home.hero_sub')}
            </p>

            {/* Search is the primary action on any job platform — it goes above
                the CTAs, not below them. */}
            <form
              onSubmit={handleSearch}
              className="mt-8 bg-bg-surface border border-border-subtle rounded-card shadow-lift p-2
                flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('home.search_role')}
                  aria-label={t('home.search_role')}
                  className="w-full h-12 pl-11 pr-3 bg-transparent rounded-input text-text-primary
                    placeholder:text-text-muted focus:outline-none"
                />
              </div>
              <div className="relative flex-1 sm:max-w-[13rem] sm:border-l sm:border-border-subtle">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  list="hero-cities"
                  placeholder={t('home.search_city')}
                  aria-label={t('home.search_city')}
                  className="w-full h-12 pl-11 pr-3 bg-transparent rounded-input text-text-primary
                    placeholder:text-text-muted focus:outline-none"
                />
                <datalist id="hero-cities">
                  {cities.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <Button type="submit" variant="primary" size="lg" className="sm:w-auto">
                <Search size={17} />
                {t('home.search_btn')}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep hover:gap-2.5 transition-all"
              >
                {t('home.cta_find')} <ArrowRight size={16} />
              </Link>
              <span className="hidden sm:block w-px h-4 bg-border-strong" />
              <Link
                to="/provider/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-brand-deep transition-colors"
              >
                <Building2 size={16} /> {t('home.cta_post')}
              </Link>
            </div>
          </div>

          {/* ---- Image column ---- */}
          <div className="relative hidden lg:block animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="relative rounded-[26px] overflow-hidden shadow-deep aspect-[4/5]">
              <img
                src={HERO_IMG}
                alt="Two colleagues in conversation during a job interview"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-deeper/55 via-transparent to-transparent" />
            </div>

            {/* Secondary photo, offset */}
            <div className="absolute -left-10 bottom-16 w-40 h-40 rounded-2xl overflow-hidden shadow-lift border-4 border-bg-primary hidden xl:block">
              <img src={HERO_IMG_2} alt="Professional at work" className="w-full h-full object-cover" loading="lazy" />
            </div>

            {/* Floating proof cards — these demo the actual product */}
            <div className="absolute -right-5 top-12 bg-bg-surface rounded-2xl shadow-lift border border-border-subtle p-4 w-52 animate-fade-up"
                 style={{ animationDelay: '350ms' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  {t('home.float_match')}
                </span>
                <span className="text-xl font-extrabold text-brand-deep">96%</span>
              </div>
              <div className="h-1.5 bg-bg-elevated rounded-full mt-2.5 overflow-hidden">
                <div className="h-full w-[96%] bg-brand-green rounded-full" />
              </div>
              <p className="text-[11px] text-text-secondary mt-2.5 leading-snug">
                {t('home.float_match_sub')}
              </p>
            </div>

            <div className="absolute -left-4 top-1/3 bg-bg-surface rounded-2xl shadow-lift border border-border-subtle px-4 py-3 flex items-center gap-2.5 animate-fade-up"
                 style={{ animationDelay: '500ms' }}>
              <span className="w-8 h-8 rounded-full bg-brand-green grid place-items-center">
                <Trophy size={15} className="text-brand-ink" />
              </span>
              <div>
                <div className="text-xs font-bold text-text-primary">{t('home.float_hired')}</div>
                <div className="text-[11px] text-text-muted">{t('home.float_hired_sub')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================== TRUSTED BY */}
      {companies.length > 0 && (
        <section className="border-y border-border-subtle bg-bg-surface">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              {t('home.trusted_title')}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {companies.map((c) => (
                <Link
                  key={c._id}
                  to={`/companies/${c._id}`}
                  className="group flex items-start gap-3.5 p-4 rounded-card border border-border-subtle
                    bg-bg-primary hover:border-brand-green/45 hover:shadow-card transition-all duration-200"
                >
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-text-primary truncate group-hover:text-brand-deep transition-colors">
                        {c.name}
                      </span>
                      {c.isVerified && <ShieldCheck size={13} className="text-success shrink-0" />}
                    </div>
                    <p className="text-[11px] text-text-muted truncate">{c.industry}</p>
                    <p className="text-[11px] font-semibold text-brand-deep mt-1">
                      {c.openRoles} {c.openRoles === 1 ? t('home.open_role') : t('home.open_roles')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* ==================================================== WHY FURSAD */}
      <section className="bg-bg-surface border-y border-border-subtle">
        <div className="section">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="eyebrow">{t('home.why_eyebrow')}</span>
            <h2 className="font-display text-4xl font-semibold text-text-primary mt-4">
              {t('home.why_title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <ValueProp icon={Target} title={t('home.why_1_t')} body={t('home.why_1_d')} />
            <ValueProp icon={BadgeDollarSign} title={t('home.why_2_t')} body={t('home.why_2_d')} />
            <ValueProp icon={ShieldCheck} title={t('home.why_3_t')} body={t('home.why_3_d')} />
            <ValueProp icon={Languages} title={t('home.why_4_t')} body={t('home.why_4_d')} />
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

/* ------------------------------------------------------------------ */

const ValueProp = ({ icon: Icon, title, body }) => (
  <div className="p-6 rounded-card border border-border-subtle bg-bg-primary hover:border-brand-green/40 hover:shadow-card transition-all duration-200">
    <span className="w-11 h-11 rounded-xl bg-brand-muted grid place-items-center">
      <Icon size={20} className="text-brand-deep" />
    </span>
    <h3 className="font-bold text-text-primary mt-4">{title}</h3>
    <p className="text-sm text-text-secondary mt-2 leading-relaxed">{body}</p>
  </div>
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
        <span className="eyebrow">{t('home.how_eyebrow')}</span>
        <h2 className="font-display text-4xl sm:text-[2.75rem] font-semibold text-text-primary mt-4 leading-tight">
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
          <span className="eyebrow">{t('home.faq_eyebrow')}</span>
          <h2 className="font-display text-4xl font-semibold text-text-primary mt-4">
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
