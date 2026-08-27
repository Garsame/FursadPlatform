import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Send, CheckCircle2, RefreshCw, Target, TrendingUp, AlertTriangle, Pencil,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

/**
 * The AI interviewer. One question at a time, answers folded straight back into
 * the fields the matching engine reads, ending in a derived job specification.
 */
const ProfileBuilder = () => {
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // The question-and-answer pair currently in flight. Without it the typed
  // answer disappears the moment Send is pressed — it has left the input but
  // has not yet come back in `history` — and the next question then appears
  // out of nowhere several seconds later.
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const load = async () => {
    try {
      const res = await api.get('/profile/interview');
      if (res.data?.success) setState(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the profile builder.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state?.history?.length, state?.question]);

  const send = async (e) => {
    e.preventDefault();
    if (!answer.trim() || sending) return;
    const submitted = answer.trim();

    setSending(true);
    setPending({ question: state.question, answer: submitted });
    setAnswer('');
    setError('');
    try {
      const res = await api.post('/profile/interview', {
        field: state.field,
        question: state.question,
        answer: submitted,
      });
      if (res.data?.success) setState(res.data.data);
    } catch (err) {
      // Hand the answer back so it is not lost to a failed request.
      setAnswer(submitted);
      setError(err.response?.data?.message || 'Could not save that answer.');
    } finally {
      setSending(false);
      setPending(null);
    }
  };

  const regenerate = async () => {
    setSending(true);
    try {
      const res = await api.post('/profile/specification');
      if (res.data?.success) setState((s) => ({ ...s, mainJobSpecification: res.data.data }));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="h-8 w-1/2 bg-bg-elevated rounded animate-pulse" />
        <div className="h-64 bg-bg-elevated rounded-card mt-6 animate-pulse" />
      </div>
    );
  }

  const spec = state?.mainJobSpecification;
  const hasSpec = spec?.generatedAt || spec?.title;
  const progress = state ? Math.round((state.answered / state.total) * 100) : 0;

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-brand-muted grid place-items-center">
            <Sparkles size={18} className="text-brand-deep" />
          </span>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Build my profile</h1>
        </div>
        <p className="text-text-secondary mt-2 max-w-prose">
          A few questions, one at a time. Your answers go straight into your match scores —
          and at the end JobAssistAI works out the single job specification that fits you best.
        </p>

        {state && !state.aiLive && (
          <div className="flex items-start gap-2.5 bg-accent-ochreMuted border border-accent-ochre/40 rounded-input p-3 mt-4">
            <AlertTriangle size={16} className="text-accent-ochreInk shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              No Gemini API key is configured, so questions come from the built-in script and the
              final specification will be a placeholder. Add <code className="font-mono text-xs">GEMINI_API_KEY</code> to
              the backend <code className="font-mono text-xs">.env</code> to switch this on.
            </p>
          </div>
        )}
      </header>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-text-secondary">
            {state?.answered} of {state?.total} answered
          </span>
          <span className="font-extrabold text-brand-deep">{progress}%</span>
        </div>
        <div className="w-full bg-bg-elevated h-2 rounded-full overflow-hidden mt-1.5">
          <div className="bg-brand-green h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6">
        <div className="flex flex-col gap-5 max-h-[46vh] overflow-y-auto pr-1">
          {state?.history?.map((h) => (
            <div key={h.field}>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-muted grid place-items-center shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-brand-deep" />
                </span>
                <p className="text-sm text-text-secondary leading-relaxed pt-1">{h.question}</p>
              </div>
              <div className="flex justify-end mt-2">
                <p className="text-sm bg-brand-deep text-text-inverse rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                  {h.answer}
                </p>
              </div>
            </div>
          ))}

          {!state?.done && state?.question && !pending && (
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-brand-muted grid place-items-center shrink-0 mt-0.5">
                <Sparkles size={13} className="text-brand-deep" />
              </span>
              <p className="text-[15px] font-medium text-text-primary leading-relaxed pt-0.5">
                {state.question}
              </p>
            </div>
          )}

          {/* The pair being saved right now, shown exactly like a finished one
              so the conversation never appears to lose a turn. */}
          {pending && (
            <div>
              <div className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-muted grid place-items-center shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-brand-deep" />
                </span>
                <p className="text-sm text-text-secondary leading-relaxed pt-1">{pending.question}</p>
              </div>
              <div className="flex justify-end mt-2">
                <p className="text-sm bg-brand-deep text-text-inverse rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                  {pending.answer}
                </p>
              </div>
            </div>
          )}

          {/* Gemini writes each question from the answer before it, which takes
              a couple of seconds. This is what fills that gap. */}
          {sending && (
            <div className="flex gap-3" role="status" aria-live="polite">
              <span className="w-7 h-7 rounded-full bg-brand-muted grid place-items-center shrink-0 mt-0.5">
                <Sparkles size={13} className="text-brand-deep" />
              </span>
              <span className="inline-flex items-center gap-2.5 pt-1.5">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-brand-deep/45 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
                <span className="text-sm text-text-muted">Thinking about your next question…</span>
              </span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && <p className="text-sm text-danger mt-4">{error}</p>}

        {!state?.done ? (
          <form onSubmit={send} className="flex gap-2 mt-6 pt-5 border-t border-border-subtle">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              autoFocus
              className="flex-1 h-input px-4 bg-bg-primary border border-border-subtle rounded-input
                text-text-primary placeholder:text-text-muted focus:outline-none
                focus:border-brand-green focus:ring-4 focus:ring-brand-green/18 transition-all"
            />
            <Button type="submit" variant="primary" loading={sending} disabled={!answer.trim()}>
              {!sending && <Send size={16} />} {sending ? 'Saving…' : 'Send'}
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2 mt-6 pt-5 border-t border-border-subtle">
            <CheckCircle2 size={18} className="text-success" />
            <p className="text-sm font-semibold text-text-primary">All questions answered.</p>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={regenerate} loading={sending}>
              {!sending && <RefreshCw size={14} />} {sending ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </div>
        )}
      </div>

      {/* Derived specification */}
      {hasSpec && (
        <div className="mt-8 rounded-card bg-bg-deep text-text-inverse p-6 shadow-deep">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ochre">
            <Target size={14} /> Your main job specification
          </span>
          <h2 className="font-display text-3xl font-semibold mt-3">{spec.title || '—'}</h2>
          {spec.summary && (
            <p className="text-text-onDeepDim mt-3 leading-relaxed max-w-prose">{spec.summary}</p>
          )}

          {spec.strengths?.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-ochre mb-2">Strengths</p>
              <div className="flex flex-wrap gap-2">
                {spec.strengths.map((s) => <Badge key={s} variant="onDeep">{s}</Badge>)}
              </div>
            </div>
          )}

          {spec.suggestedRoles?.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-ochre mb-2">
                Roles to search for
              </p>
              <div className="flex flex-wrap gap-2">
                {spec.suggestedRoles.map((r) => (
                  <Link key={r} to={`/jobs?search=${encodeURIComponent(r)}`}>
                    <Badge variant="onDeep" className="hover:bg-white/20 transition-colors cursor-pointer">
                      {r}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(spec.idealSalary?.min > 0 || spec.idealSalary?.max > 0) && (
            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-border-onDeep">
              <TrendingUp size={16} className="text-brand-green" />
              <span className="text-sm text-text-onDeepDim">Target salary</span>
              <span className="text-sm font-bold ml-auto">
                ${spec.idealSalary.min?.toLocaleString()} – ${spec.idealSalary.max?.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/dashboard/jobs">
              <Button variant="primary">See my matched jobs</Button>
            </Link>
            <Link to="/dashboard/profile">
              <Button variant="onDeep"><Pencil size={15} /> Edit profile details</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileBuilder;
