import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Briefcase, GraduationCap, TrendingUp, Globe, ArrowLeft,
  CheckCircle2, Building2, Clock, AlertCircle, FileText,
} from 'lucide-react';
import api from '../../services/api';
import { useJobseekerAuth } from '../../context/JobseekerAuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import CompanyLogo from '../../components/CompanyLogo';
import JobCard, { formatSalary, formatPosted } from '../../components/JobCard';
import RichText from '../../components/ui/RichText';

const JobDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useJobseekerAuth();

  const [job, setJob] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [cvs, setCvs] = useState([]);
  const [cvsLoading, setCvsLoading] = useState(false);
  const [chosenCv, setChosenCv] = useState('');
  const [applied, setApplied] = useState(false);

  const isJobseeker = isAuthenticated && user?.role === 'jobseeker';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await api.get(`/jobs/${id}`);
        if (res.data?.success) {
          setJob(res.data.data);
          const all = await api.get('/jobs');
          if (all.data?.success) {
            setRelated(all.data.data.filter((j) => j._id !== id).slice(0, 3));
          }
        } else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
    window.scrollTo({ top: 0 });
  }, [id]);

  const handleApplyClick = async () => {
    // Anonymous visitors get sent to sign in and returned here afterwards.
    if (!isJobseeker) {
      navigate(`/signin?redirect=${encodeURIComponent(`/jobs/${id}`)}`);
      return;
    }
    setApplyError('');
    setCoverNote('');
    setApplyOpen(true);

    // A CV is required, so load them before the person writes a cover note
    // only to be turned away on submit.
    setCvsLoading(true);
    try {
      const res = await api.get('/cvs');
      const list = res.data?.success ? res.data.data : [];
      setCvs(list);
      setChosenCv((list.find((c) => c.isPrimary) || list[0])?._id || '');
    } catch {
      setCvs([]);
    } finally {
      setCvsLoading(false);
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!chosenCv) {
      setApplyError('Please choose which CV to send.');
      return;
    }
    setSubmitting(true);
    setApplyError('');
    try {
      const res = await api.post('/applications', { jobId: id, coverNote, cvId: chosenCv });
      if (res.data?.success) {
        setApplied(true);
        setTimeout(() => setApplyOpen(false), 1400);
      }
    } catch (err) {
      setApplyError(err.response?.data?.message || t('jobdetail.apply_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-2xl">
        <div className="h-10 w-2/3 bg-bg-elevated rounded-lg animate-pulse" />
        <div className="h-4 w-1/3 bg-bg-elevated rounded mt-4 animate-pulse" />
        <div className="h-72 bg-bg-elevated rounded-card mt-8 animate-pulse" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-3xl text-center">
        <span className="w-16 h-16 rounded-2xl bg-bg-elevated grid place-items-center mx-auto">
          <AlertCircle size={26} className="text-text-muted" />
        </span>
        <h1 className="font-display text-3xl font-semibold mt-6">{t('jobdetail.notfound_title')}</h1>
        <p className="text-text-secondary mt-2">{t('jobdetail.notfound_sub')}</p>
        <Link to="/jobs"><Button variant="primary" className="mt-8">{t('jobdetail.back_to_jobs')}</Button></Link>
      </div>
    );
  }

  const salary = formatSalary(job.salaryRange);
  const posted = formatPosted(job.publishedAt || job.createdAt);

  const facts = [
    { icon: MapPin,        label: t('jobdetail.location'),  value: [job.location?.city, job.location?.country].filter(Boolean).join(', ') || '—' },
    { icon: Briefcase,     label: t('jobdetail.type'),      value: (job.employmentType || '').replace('-', ' ') },
    { icon: TrendingUp,    label: t('jobdetail.experience'),value: job.experienceLevel || '—' },
    { icon: GraduationCap, label: t('jobdetail.education'), value: job.educationLevel || '—' },
    { icon: Globe,         label: t('jobdetail.language'),  value: job.language === 'so' ? 'Somali' : 'English' },
  ];

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-lg">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-brand-deep transition-colors"
        >
          <ArrowLeft size={16} /> {t('jobdetail.back_to_jobs')}
        </Link>

        <div className="grid lg:grid-cols-[1fr_20rem] gap-8 mt-6 items-start">
          {/* ------------------------------------------------ Main column */}
          <div>
            <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start gap-5">
                <CompanyLogo name={job.company?.name} logoUrl={job.company?.logoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-text-primary leading-tight">
                    {job.title}
                  </h1>
                  <p className="text-text-secondary mt-2">
                    <span className="font-semibold text-text-primary">{job.company?.name}</span>
                    {job.company?.industry && <> · {job.company.industry}</>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {salary && <Badge variant="brand">{salary} / {t('jobdetail.month')}</Badge>}
                    <Badge variant="neutral" className="capitalize">
                      {(job.employmentType || '').replace('-', ' ')}
                    </Badge>
                    {posted && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock size={13} /> {posted}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description — the AI writes light Markdown, so render it. */}
              <div className="mt-8 pt-8 border-t border-border-subtle">
                <h2 className="font-bold text-lg text-text-primary mb-4">{t('jobdetail.about_role')}</h2>
                <RichText className="text-[15px] text-text-secondary leading-[1.75] max-w-prose">
                  {job.description}
                </RichText>
              </div>

              {job.skillsRequired?.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border-subtle">
                  <h2 className="font-bold text-lg text-text-primary mb-4">{t('jobdetail.skills')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skillsRequired.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill
                          bg-brand-muted border border-brand-green/25 text-sm font-medium text-brand-deep"
                      >
                        <CheckCircle2 size={14} /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.company?.description && (
                <div className="mt-8 pt-8 border-t border-border-subtle">
                  <h2 className="font-bold text-lg text-text-primary mb-3">
                    {t('jobdetail.about_company', { name: job.company.name })}
                  </h2>
                  <p className="text-[15px] text-text-secondary leading-relaxed max-w-prose">
                    {job.company.description}
                  </p>
                  {job.company.website && (
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep mt-4 hover:underline"
                    >
                      <Building2 size={15} /> {job.company.website}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ Sticky rail */}
          <aside className="lg:sticky lg:top-24 flex flex-col gap-4">
            <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6">
              {salary ? (
                <>
                  <div className="text-2xl font-extrabold text-text-primary">{salary}</div>
                  <div className="text-xs text-text-muted mt-0.5">{t('jobdetail.per_month')}</div>
                </>
              ) : (
                <div className="text-sm font-semibold text-text-secondary">
                  {t('jobdetail.salary_undisclosed')}
                </div>
              )}

              <Button variant="primary" size="lg" fullWidth className="mt-5" onClick={handleApplyClick}>
                {isJobseeker ? t('jobdetail.apply_now') : t('jobdetail.signin_to_apply')}
              </Button>

              {!isJobseeker && (
                <p className="text-xs text-text-muted text-center mt-3 leading-relaxed">
                  {t('jobdetail.apply_hint')}
                </p>
              )}

              <dl className="mt-6 pt-6 border-t border-border-subtle flex flex-col gap-4">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <f.icon size={16} className="text-text-muted mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        {f.label}
                      </dt>
                      <dd className="text-sm font-medium text-text-primary capitalize truncate">
                        {f.value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>

        {/* ------------------------------------------------ Related roles */}
        {related.length > 0 && (
          <div className="mt-2xl">
            <h2 className="font-display text-2xl font-semibold text-text-primary mb-6">
              {t('jobdetail.related')}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((j) => <JobCard key={j._id} job={j} />)}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ Apply modal */}
      <Modal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={applied ? t('jobdetail.applied_title') : t('jobdetail.apply_to', { title: job.title })}
        subtitle={applied ? '' : job.company?.name}
      >
        {applied ? (
          <div className="text-center py-6">
            <span className="w-14 h-14 rounded-full bg-brand-muted grid place-items-center mx-auto">
              <CheckCircle2 size={28} className="text-success" />
            </span>
            <p className="text-text-secondary mt-4">{t('jobdetail.applied_sub')}</p>
            <Link to="/dashboard/applications">
              <Button variant="secondary" className="mt-5">{t('jobdetail.track_application')}</Button>
            </Link>
          </div>
        ) : cvsLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-brand-green" />
          </div>
        ) : cvs.length === 0 ? (
          // Applying without a CV leaves the employer nothing to read, so the
          // journey stops here and points at the fix.
          <div className="text-center py-6">
            <span className="w-14 h-14 rounded-full bg-bg-elevated grid place-items-center mx-auto">
              <FileText size={26} className="text-text-muted" />
            </span>
            <h4 className="font-bold text-text-primary mt-4">You need a CV first</h4>
            <p className="text-sm text-text-secondary mt-2 max-w-sm mx-auto">
              Every application is sent with a CV so the employer has something to read. Upload one
              and you can apply straight away.
            </p>
            <Link to="/dashboard/cvs">
              <Button variant="primary" className="mt-5">Upload a CV</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submitApplication}>
            <label className="text-sm font-semibold text-text-primary">Which CV should we send?</label>
            <div className="flex flex-col gap-2 mt-2 mb-5">
              {cvs.map((cv) => (
                <label
                  key={cv._id}
                  className={`flex items-center gap-3 p-3 rounded-input border cursor-pointer transition-colors ${
                    chosenCv === cv._id
                      ? 'border-brand-green/50 bg-brand-muted'
                      : 'border-border-subtle hover:border-border-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="cv"
                    value={cv._id}
                    checked={chosenCv === cv._id}
                    onChange={() => setChosenCv(cv._id)}
                    className="accent-brand-green"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-primary truncate">{cv.label}</span>
                    <span className="block text-[11px] text-text-muted truncate">
                      {cv.originalName}
                      {cv.parseStatus !== 'parsed' && ' · not analysed, so it will not improve your match score'}
                    </span>
                  </span>
                  {cv.isPrimary && <Badge variant="neutral">Default</Badge>}
                </label>
              ))}
            </div>

            <label htmlFor="coverNote" className="text-sm font-semibold text-text-primary">
              {t('jobdetail.cover_label')}
            </label>
            <p className="text-xs text-text-muted mt-1 mb-3">{t('jobdetail.cover_hint')}</p>
            <textarea
              id="coverNote"
              rows={6}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder={t('jobdetail.cover_placeholder')}
              className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-input
                text-text-primary placeholder:text-text-muted resize-none
                focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/18 transition-all"
            />

            {applyError && (
              <p className="flex items-center gap-2 text-sm text-danger mt-3">
                <AlertCircle size={15} /> {applyError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" fullWidth onClick={() => setApplyOpen(false)}>
                {t('jobdetail.cancel')}
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={submitting}>
                {submitting ? t('jobdetail.submitting') : t('jobdetail.submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};

export default JobDetail;
