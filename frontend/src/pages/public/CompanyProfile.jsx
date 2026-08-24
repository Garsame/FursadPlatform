import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Globe, Users, CalendarDays, CheckCircle2, ArrowLeft, Building2, Heart, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import JobCard from '../../components/JobCard';
import CompanyLogo from '../../components/CompanyLogo';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const CompanyProfile = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/companies/${id}`);
        if (res.data?.success) setData(res.data.data); else setNotFound(true);
      } catch { setNotFound(true); } finally { setLoading(false); }
    })();
    window.scrollTo({ top: 0 });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-2xl">
        <div className="h-40 bg-bg-elevated rounded-card animate-pulse" />
        <div className="h-64 bg-bg-elevated rounded-card mt-6 animate-pulse" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-3xl text-center">
        <span className="w-16 h-16 rounded-2xl bg-bg-elevated grid place-items-center mx-auto">
          <AlertCircle size={26} className="text-text-muted" />
        </span>
        <h1 className="font-display text-3xl font-semibold mt-6">Employer not found</h1>
        <Link to="/jobs"><Button variant="primary" className="mt-8">Browse jobs</Button></Link>
      </div>
    );
  }

  const { company: c, jobs } = data;
  const facts = [
    c.location?.city && { icon: MapPin, label: [c.location.city, c.location.country].filter(Boolean).join(', ') },
    c.companySize && { icon: Users, label: `${c.companySize} employees` },
    c.foundedYear && { icon: CalendarDays, label: `Founded ${c.foundedYear}` },
    c.industry && { icon: Building2, label: c.industry },
  ].filter(Boolean);

  return (
    <>
      {/* Header band */}
      <section className="bg-bg-deep text-text-inverse">
        <div className="max-w-5xl mx-auto px-6 pt-lg pb-xl">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-onDeepDim hover:text-text-inverse transition-colors">
            <ArrowLeft size={16} /> Back to jobs
          </Link>

          <div className="flex flex-wrap items-start gap-6 mt-6">
            {c.logoUrl ? (
              <img
                src={`${API_ORIGIN}${c.logoUrl}`}
                alt={`${c.name} logo`}
                className="w-24 h-24 rounded-2xl object-cover bg-white/10 border border-border-onDeep shrink-0"
              />
            ) : (
              <CompanyLogo name={c.name} size="lg" className="shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl font-semibold">{c.name}</h1>
                {c.isVerified && (
                  <Badge variant="onDeep"><CheckCircle2 size={12} className="text-brand-green" /> Verified employer</Badge>
                )}
              </div>
              {c.tagline && <p className="text-text-onDeepDim mt-2 text-lg">{c.tagline}</p>}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-sm text-text-onDeepDim">
                {facts.map((f) => (
                  <span key={f.label} className="inline-flex items-center gap-1.5">
                    <f.icon size={15} className="text-brand-green" /> {f.label}
                  </span>
                ))}
                {c.website && (
                  <a href={c.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-text-inverse transition-colors">
                    <Globe size={15} className="text-brand-green" /> {c.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <div className="text-3xl font-extrabold text-brand-green leading-none">{jobs.length}</div>
              <div className="text-xs uppercase tracking-wide text-text-onDeepDim mt-1">
                open {jobs.length === 1 ? 'role' : 'roles'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-lg grid lg:grid-cols-[1fr_18rem] gap-8 items-start">
        <div>
          {(c.description || c.about) && (
            <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6 sm:p-8">
              <h2 className="font-bold text-lg text-text-primary mb-4">About {c.name}</h2>
              {c.description && (
                <p className="text-[15px] text-text-secondary leading-[1.75] max-w-prose">{c.description}</p>
              )}
              {c.about && (
                <div className="text-[15px] text-text-secondary leading-[1.75] whitespace-pre-line max-w-prose mt-4">
                  {c.about}
                </div>
              )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-display text-2xl font-semibold text-text-primary mb-5">
              Open roles at {c.name}
            </h2>
            {jobs.length === 0 ? (
              <div className="text-center py-xl border border-dashed border-border-strong rounded-card bg-bg-surface">
                <p className="text-sm text-text-secondary">No open roles right now.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {jobs.map((j) => <JobCard key={j._id} job={j} />)}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {c.benefits?.length > 0 && (
            <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-5">
              <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                <Heart size={16} className="text-brand-deep" /> Benefits
              </h3>
              <ul className="flex flex-col gap-2">
                {c.benefits.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-text-secondary">
                    <CheckCircle2 size={15} className="text-brand-green shrink-0 mt-0.5" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.values?.length > 0 && (
            <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-5">
              <h3 className="font-bold text-text-primary mb-3">Values</h3>
              <div className="flex flex-wrap gap-2">
                {c.values.map((v) => <Badge key={v} variant="brand">{v}</Badge>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
};

export default CompanyProfile;
