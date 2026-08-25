import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  FileStack, Trophy, TrendingUp, TrendingDown, Target, Languages,
  Award, ArrowRight, Sparkles, Info,
} from 'lucide-react';

const tone = (n) =>
  n >= 75 ? 'text-success' : n >= 60 ? 'text-brand-deep' : n >= 40 ? 'text-accent-ochreInk' : 'text-danger';

const bg = (n) =>
  n >= 75 ? 'bg-success/12' : n >= 60 ? 'bg-brand-muted' : n >= 40 ? 'bg-accent-ochreMuted' : 'bg-danger/8';

/**
 * Which CV wins where.
 *
 * The matched-jobs list already let a candidate switch which CV drives the
 * ranking, but only one at a time, so comparing two of them meant holding
 * numbers in your head across page loads. This scores the whole grid at once
 * and answers the question directly: send this one for that job.
 */
const CvPerformance = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/profile/cv-performance');
        if (res.data?.success) {
          setData(res.data.data);
          setNote(res.data.message || '');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not compare your CVs.');
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

  if (error) return <Card className="text-center py-12 text-danger">{error}</Card>;

  const { summaries = [], matrix = [], cvs = [], overall, jobCount } = data || {};

  if (!summaries.length) {
    return (
      <Card className="text-center py-2xl flex flex-col items-center gap-3">
        <div className="p-4 bg-bg-elevated rounded-full text-text-muted"><FileStack size={28} /></div>
        <h3 className="font-bold text-text-primary">Nothing to compare yet</h3>
        <p className="text-sm text-text-secondary max-w-sm">
          {note || 'Upload at least one CV and let it finish being analysed, then come back to see how it performs against every open job.'}
        </p>
        <Button variant="primary" className="mt-2" onClick={() => navigate('/dashboard/cvs')}>
          Go to my CVs
        </Button>
      </Card>
    );
  }

  const single = summaries.length === 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-text-primary">How your CVs perform</h1>
        <p className="text-text-secondary mt-2 max-w-prose">
          Every CV you have, scored against all {jobCount} open jobs. The point is not the
          numbers — it is knowing which CV to send with which application.
        </p>
      </div>

      {/* The single most useful sentence on the page */}
      {overall && !single && (
        <Card className="border-brand-green/40 bg-brand-muted flex flex-col gap-2">
          <h3 className="font-bold text-brand-deep flex items-center gap-2">
            <Trophy size={17} /> Your strongest CV overall is “{overall.bestCvLabel}”
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            It averages <strong className="text-brand-deep">{overall.bestAvg}%</strong> across every open job.
            {overall.biggestMargin?.margin > 0 && (
              <>
                {' '}The choice matters most on <strong className="text-text-primary">{overall.biggestMargin.title}</strong>
                {overall.biggestMargin.companyName ? ` at ${overall.biggestMargin.companyName}` : ''},
                where picking the right CV is worth{' '}
                <strong className="text-brand-deep">+{overall.biggestMargin.margin} points</strong>.
              </>
            )}
          </p>
        </Card>
      )}

      {/* Per-CV cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {summaries.map((s) => (
          <Card key={s.cvId} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-text-primary truncate">{s.label}</h3>
                  {s.isPrimary && <Badge variant="brand">Default</Badge>}
                  {!single && String(s.cvId) === String(overall?.bestCvId) && (
                    <Badge variant="success"><Trophy size={10} /> Strongest</Badge>
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate mt-0.5">{s.originalName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-3xl font-extrabold tabular-nums ${tone(s.avgScore)}`}>{s.avgScore}%</p>
                <p className="text-[11px] text-text-muted">average</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Best', `${s.bestScore}%`, tone(s.bestScore)],
                ['Above 70%', `${s.above70}/${jobCount}`, s.above70 > 0 ? 'text-success' : 'text-text-muted'],
                [single ? 'Lowest' : 'Wins on', single ? `${s.worstScore}%` : `${s.winsOn} job${s.winsOn === 1 ? '' : 's'}`,
                  single ? tone(s.worstScore) : (s.winsOn > 0 ? 'text-brand-deep' : 'text-text-muted')],
              ].map(([label, value, cls]) => (
                <div key={label} className="bg-bg-elevated rounded-input py-2">
                  <p className={`text-sm font-bold tabular-nums ${cls}`}>{value}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <p className="flex items-center gap-1.5 text-text-secondary">
                <TrendingUp size={13} className="text-success shrink-0" />
                Strongest factor: <strong className="text-text-primary">{s.strongest.factor}</strong> ({s.strongest.score}%)
              </p>
              <p className="flex items-center gap-1.5 text-text-secondary">
                <TrendingDown size={13} className="text-accent-ochreInk shrink-0" />
                Weakest: <strong className="text-text-primary">{s.weakest.factor}</strong> ({s.weakest.score}%) — improving this lifts every score
              </p>
              <p className="flex items-center gap-1.5 text-text-secondary">
                <Target size={13} className="text-brand-deep shrink-0" />
                Best job: <strong className="text-text-primary truncate">{s.bestJob.title}</strong>
                <span className={`font-bold tabular-nums ${tone(s.bestJob.score)}`}>{s.bestJob.score}%</span>
              </p>
            </div>

            {(s.languages?.length > 0 || s.certifications?.length > 0) && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
                {s.languages?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Languages size={13} className="text-text-muted shrink-0 mt-1" />
                    <div className="flex flex-wrap gap-1.5">
                      {s.languages.map((l, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-pill bg-bg-elevated
                          border border-border-subtle text-text-secondary">
                          {l.name}{l.proficiency ? ` · ${l.proficiency}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {s.certifications?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Award size={13} className="text-text-muted shrink-0 mt-1" />
                    <div className="flex flex-wrap gap-1.5">
                      {s.certifications.map((c, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-pill bg-accent-ochreMuted
                          border border-accent-ochre/30 text-accent-ochreInk">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* The grid */}
      <Card className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <Sparkles size={16} className="text-brand-deep" /> Every job, every CV
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {single
              ? 'Ranked by how well your CV scores. Upload a second CV to see them compared side by side.'
              : 'The winning CV for each job is highlighted. Ranked by the best score available to you.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border-subtle">
                <th className="pb-2.5 font-semibold">Job</th>
                {cvs.map((c) => (
                  <th key={c._id} className="pb-2.5 font-semibold text-center px-2 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                {!single && <th className="pb-2.5 font-semibold text-right">Gain</th>}
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.jobId} className="border-b border-border-subtle last:border-0 hover:bg-bg-elevated/40">
                  <td className="py-3 pr-3 min-w-[180px]">
                    <p className="font-semibold text-text-primary leading-snug">{row.title}</p>
                    <p className="text-[11px] text-text-muted">
                      {row.companyName}{row.city ? ` · ${row.city}` : ''}
                    </p>
                  </td>

                  {cvs.map((c) => {
                    const cell = row.cells.find((x) => String(x.cvId) === String(c._id));
                    const isBest = !single && String(row.bestCvId) === String(c._id);
                    return (
                      <td key={c._id} className="py-3 px-2 text-center">
                        <span className={`inline-block min-w-[52px] px-2 py-1 rounded-btn text-sm font-bold
                          tabular-nums ${bg(cell.score)} ${tone(cell.score)}
                          ${isBest ? 'ring-2 ring-brand-green/50' : ''}`}>
                          {cell.score}%
                        </span>
                      </td>
                    );
                  })}

                  {!single && (
                    <td className="py-3 text-right">
                      {row.margin > 0
                        ? <span className="text-xs font-bold text-brand-deep tabular-nums">+{row.margin}</span>
                        : <span className="text-xs text-text-muted">—</span>}
                    </td>
                  )}

                  <td className="py-3 pl-2 text-right">
                    <Button variant="ghost" className="h-8 text-xs"
                            onClick={() => navigate(`/jobs/${row.jobId}`)}>
                      Open <ArrowRight size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!single && (
          <p className="flex items-start gap-2 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
            <Info size={13} className="shrink-0 mt-0.5" />
            “Gain” is how many points the best CV earns over your next best on that job. A large
            gain means the choice genuinely matters; a zero means either CV would do.
          </p>
        )}
      </Card>
    </div>
  );
};

export default CvPerformance;
