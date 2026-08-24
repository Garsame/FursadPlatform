import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Briefcase, ArrowUpRight } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import Badge from './ui/Badge';

export const formatSalary = (range) => {
  if (!range || (!range.min && !range.max)) return null;
  const cur = range.currency || 'USD';
  const sym = cur === 'USD' ? '$' : '';
  const fmt = (n) => `${sym}${Number(n).toLocaleString()}`;
  if (range.min && range.max) return `${fmt(range.min)} – ${fmt(range.max)}`;
  return `${fmt(range.min || range.max)}+`;
};

export const formatPosted = (date) => {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Posted ${months} month${months > 1 ? 's' : ''} ago`;
};

const TYPE_LABEL = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  remote: 'Remote',
};

/**
 * One job card, used identically on the landing page preview and the /jobs
 * board so the two never drift apart.
 */
const JobCard = ({ job, matchScore = null, className = '' }) => {
  const salary = formatSalary(job.salaryRange);
  const posted = formatPosted(job.publishedAt || job.createdAt);
  const city = job.location?.city;
  const country = job.location?.country;

  return (
    <Link
      to={`/jobs/${job._id}`}
      className={`group relative flex flex-col bg-bg-surface border border-border-subtle rounded-card
        shadow-card p-5 transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lift hover:border-brand-green/45 ${className}`}
    >
      {/* Header: logo + title + company */}
      <div className="flex items-start gap-3.5">
        <CompanyLogo name={job.company?.name} logoUrl={job.company?.logoUrl} size="md" />

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] leading-snug text-text-primary line-clamp-2 group-hover:text-brand-deep transition-colors">
            {job.title}
          </h3>
          <p className="text-sm text-text-secondary mt-0.5 truncate">
            {job.company?.name || 'Confidential employer'}
          </p>
        </div>

        {matchScore !== null && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-extrabold text-brand-deep leading-none">{matchScore}%</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mt-0.5">
              match
            </div>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[13px] text-text-secondary">
        {(city || country) && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-text-muted" />
            {[city, country].filter(Boolean).join(', ')}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Briefcase size={14} className="text-text-muted" />
          {TYPE_LABEL[job.employmentType] || job.employmentType}
        </span>
      </div>

      {/* Skills */}
      {job.skillsRequired?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {job.skillsRequired.slice(0, 3).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-pill bg-bg-elevated border border-border-subtle text-[11px] font-medium text-text-secondary"
            >
              {s}
            </span>
          ))}
          {job.skillsRequired.length > 3 && (
            <span className="px-2 py-0.5 text-[11px] font-medium text-text-muted">
              +{job.skillsRequired.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: salary is the thing candidates scan for, so it anchors the card */}
      <div className="flex items-end justify-between gap-3 mt-5 pt-4 border-t border-border-subtle">
        <div>
          {salary ? (
            <>
              <div className="font-bold text-text-primary text-sm">{salary}</div>
              <div className="text-[11px] text-text-muted">per month</div>
            </>
          ) : (
            <Badge variant="neutral">Salary not disclosed</Badge>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-deep opacity-0 group-hover:opacity-100 transition-opacity">
          View role <ArrowUpRight size={15} />
        </span>
      </div>

      {posted && (
        <div className="text-[11px] text-text-muted mt-3">{posted}</div>
      )}
    </Link>
  );
};

export default JobCard;
