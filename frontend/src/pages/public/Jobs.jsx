import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, SlidersHorizontal, X, Briefcase } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import JobCard from '../../components/JobCard';

const TYPES = ['full-time', 'part-time', 'contract', 'internship', 'remote'];

const Jobs = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Draft state for the inputs; committed to the URL on submit.
  const [q, setQ] = useState(params.get('search') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const type = params.get('type') || '';
  const salaryMin = params.get('salaryMin') || '';

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Server-side filtering — GET /api/jobs supports search/city/type/salaryMin.
      const res = await api.get(`/jobs?${params.toString()}`);
      if (res.data?.success) setJobs(res.data.data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Keep inputs in sync when the URL changes from outside (e.g. hero search).
  useEffect(() => {
    setQ(params.get('search') || '');
    setCity(params.get('city') || '');
  }, [params]);

  const commit = (next) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k);
    });
    setParams(p);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    commit({ search: q.trim(), city: city.trim() });
  };

  const clearAll = () => setParams(new URLSearchParams());
  const activeCount = [...params.keys()].length;

  return (
    <>
      {/* ------------------------------------------------ Header band */}
      <section className="bg-bg-deep text-text-inverse">
        <div className="max-w-7xl mx-auto px-6 pt-lg pb-xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre">
            <Briefcase size={14} /> {t('jobs.eyebrow')}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold mt-4 leading-tight">
            {t('jobs.title')}
          </h1>
          <p className="text-text-onDeepDim mt-3 max-w-prose">{t('jobs.sub')}</p>

          {/* Search bar sits on the band, overlapping the content below */}
          <form
            onSubmit={onSubmit}
            className="mt-8 bg-bg-surface rounded-card shadow-lift p-2 flex flex-col sm:flex-row gap-2 max-w-3xl"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('home.search_role')}
                aria-label={t('home.search_role')}
                className="w-full h-12 pl-11 pr-3 bg-transparent rounded-input text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <div className="relative flex-1 sm:max-w-[13rem] sm:border-l sm:border-border-subtle">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('home.search_city')}
                aria-label={t('home.search_city')}
                className="w-full h-12 pl-11 pr-3 bg-transparent rounded-input text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="lg">
              {t('home.search_btn')}
            </Button>
          </form>
        </div>
      </section>

      {/* ------------------------------------------------ Filters + grid */}
      <section className="max-w-7xl mx-auto px-6 py-lg">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary mr-1">
            <SlidersHorizontal size={16} className="text-text-muted" />
            {t('jobs.filter_type')}
          </span>

          <button
            onClick={() => commit({ type: '' })}
            className={`px-3.5 h-9 rounded-pill text-sm font-medium border transition-all ${
              !type
                ? 'bg-brand-deep text-text-inverse border-brand-deep'
                : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-strong'
            }`}
          >
            {t('jobs.all_types')}
          </button>

          {TYPES.map((ty) => (
            <button
              key={ty}
              onClick={() => commit({ type: type === ty ? '' : ty })}
              className={`px-3.5 h-9 rounded-pill text-sm font-medium border transition-all capitalize ${
                type === ty
                  ? 'bg-brand-deep text-text-inverse border-brand-deep'
                  : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-strong'
              }`}
            >
              {ty.replace('-', ' ')}
            </button>
          ))}

          <select
            value={salaryMin}
            onChange={(e) => commit({ salaryMin: e.target.value })}
            className="h-9 px-3 rounded-pill bg-bg-surface border border-border-subtle text-sm
              text-text-secondary hover:border-border-strong focus:outline-none focus:border-brand-green"
          >
            <option value="">{t('jobs.any_salary')}</option>
            <option value="300">$300+</option>
            <option value="600">$600+</option>
            <option value="1000">$1,000+</option>
            <option value="1500">$1,500+</option>
          </select>

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-pill text-sm font-medium
                text-danger hover:bg-danger/8 transition-colors"
            >
              <X size={14} /> {t('jobs.clear')}
            </button>
          )}
        </div>

        <p className="text-sm text-text-secondary mb-6">
          {loading
            ? t('jobs.searching')
            : t('jobs.result_count', { count: jobs.length })}
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-card bg-bg-elevated animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-2xl border border-dashed border-border-strong rounded-card bg-bg-surface">
            <span className="w-16 h-16 rounded-2xl bg-bg-elevated grid place-items-center mx-auto">
              <Search size={26} className="text-text-muted" />
            </span>
            <h3 className="font-bold text-lg text-text-primary mt-5">{t('jobs.empty_title')}</h3>
            <p className="text-sm text-text-secondary mt-2 max-w-sm mx-auto">{t('jobs.empty_sub')}</p>
            {activeCount > 0 && (
              <Button variant="secondary" className="mt-6" onClick={clearAll}>
                {t('jobs.clear')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => <JobCard key={job._id} job={job} />)}
          </div>
        )}

        {/* Nudge for anonymous visitors — match scores need a profile. */}
        <div className="mt-2xl rounded-card bg-brand-muted border border-brand-green/30 px-6 py-8 text-center">
          <h3 className="font-display text-2xl font-semibold text-text-primary">
            {t('jobs.cta_title')}
          </h3>
          <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">{t('jobs.cta_sub')}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to="/signup"><Button variant="primary" size="lg">{t('jobs.cta_btn')}</Button></Link>
            <Link to="/signin"><Button variant="secondary" size="lg">{t('nav.signin')}</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Jobs;
