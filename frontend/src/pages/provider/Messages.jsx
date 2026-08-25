import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Briefcase, Send, ArrowLeft, Inbox, MessageSquare, Lock, Check, MapPin,
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const STATUS_VARIANT = {
  applied: 'neutral', reviewed: 'info', shortlisted: 'brand',
  interview: 'warning', offer: 'success', hired: 'success', rejected: 'danger',
};

const stamp = (d) => {
  const date = new Date(d);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString();
};

const scoreTone = (n) =>
  n >= 75 ? 'text-success' : n >= 50 ? 'text-brand-deep' : 'text-accent-ochreInk';

/**
 * Employer messaging, organised the way an employer thinks: by vacancy first,
 * then by candidate.
 *
 * Chat already existed, but only as a drawer buried inside one applicant's card
 * on the applicants page — so an employer with a message waiting had nowhere to
 * go and look for it. That route still works; this is the place you come to
 * when you do not already know who wrote to you.
 */
const Messages = () => {
  const [params, setParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [jobId, setJobId] = useState(params.get('job') || null);
  const [activeId, setActiveId] = useState(params.get('application') || null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [convState, setConvState] = useState(null);

  const socketRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const endRef = useRef(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const job = useMemo(() => jobs.find((j) => String(j.jobId) === String(jobId)) || null, [jobs, jobId]);
  const thread = useMemo(
    () => job?.threads.find((t) => String(t.applicationId) === String(activeId)) || null,
    [job, activeId]
  );

  const scrollDown = () =>
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));

  const load = async () => {
    try {
      const res = await api.get('/applications/employer/threads');
      if (res.data?.success) {
        setJobs(res.data.data);
        // Land on the job with something waiting rather than an arbitrary one.
        if (!jobId && res.data.data.length) {
          const busiest = [...res.data.data].sort((a, b) =>
            (b.unreadCount - a.unreadCount) || (b.conversationCount - a.conversationCount))[0];
          setJobId(busiest.jobId);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* -------------------------------------------------------------- socket */
  useEffect(() => {
    const token = localStorage.getItem('fursad_provider_token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (e) => setError(`Chat connection failed: ${e.message}`));

    socket.on('previousMessages', (prev) => { setMessages(prev); scrollDown(); });
    socket.on('conversationState', (state) => {
      if (String(state.applicationId) === String(activeIdRef.current)) setConvState(state);
      setJobs((prev) => prev.map((j) => ({
        ...j,
        threads: j.threads.map((t) => String(t.applicationId) === String(state.applicationId)
          ? { ...t, messagingAccepted: state.accepted, awaitingAcceptance: state.candidateOpenerUsed }
          : t),
      })));
    });

    socket.on('newMessage', (msg) => {
      const isOpen = String(msg.application) === String(activeIdRef.current);

      setJobs((prev) => prev.map((j) => {
        let touched = false;
        const threads = j.threads.map((t) => {
          if (String(t.applicationId) !== String(msg.application)) return t;
          touched = true;
          const fromMe = String(msg.sender) !== String(t.candidateId);
          return {
            ...t,
            unreadCount: isOpen || fromMe ? t.unreadCount : t.unreadCount + 1,
            lastMessage: { content: msg.content, createdAt: msg.createdAt, fromMe },
          };
        });
        if (!touched) return j;
        return { ...j, threads, unreadCount: threads.reduce((s, t) => s + t.unreadCount, 0) };
      }));

      if (isOpen) {
        setMessages((prev) => [...prev, msg]);
        scrollDown();
        socket.emit('markRead', msg.application);
      }
    });

    socket.on('errorMsg', (e) => setError(e.message));
    return () => socket.disconnect();
  }, []);

  /* ------------------------------------------------- open a conversation */
  useEffect(() => {
    if (!activeId || !socketRef.current) return;
    setMessages([]);
    setConvState(null);
    socketRef.current.emit('joinApplication', activeId);
    socketRef.current.emit('markRead', activeId);

    setJobs((prev) => prev.map((j) => {
      const threads = j.threads.map((t) =>
        String(t.applicationId) === String(activeId) ? { ...t, unreadCount: 0 } : t);
      return { ...j, threads, unreadCount: threads.reduce((s, t) => s + t.unreadCount, 0) };
    }));
  }, [activeId, connected]);

  const openThread = (id) => {
    setActiveId(id);
    setParams({ job: jobId, application: id }, { replace: true });
    setError('');
  };

  const pickJob = (id) => {
    setJobId(id);
    setActiveId(null);
    setMessages([]);
    setParams({ job: id }, { replace: true });
  };

  const send = (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !thread || !socketRef.current) return;
    socketRef.current.emit('sendMessage', {
      applicationId: thread.applicationId,
      recipientId: thread.candidateId,
      content,
    });
    setDraft('');
  };

  const accept = () => {
    if (thread && socketRef.current) socketRef.current.emit('acceptConversation', thread.applicationId);
  };

  /* --------------------------------------------------------------- views */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <Card className="text-center py-2xl flex flex-col items-center gap-3">
        <div className="p-4 bg-bg-elevated rounded-full text-text-muted"><Inbox size={28} /></div>
        <h3 className="font-bold text-text-primary">No jobs yet</h3>
        <p className="text-sm text-text-secondary max-w-sm">
          Post a vacancy, and every conversation with the people who apply will appear here,
          grouped by the job they applied to.
        </p>
      </Card>
    );
  }

  const accepted = convState ? convState.accepted : !!thread?.messagingAccepted;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-112px)] sm:h-[calc(100vh-136px)] min-h-[540px]">
      {error && (
        <div className="bg-danger/8 border border-danger/25 text-danger rounded-input p-3 text-sm shrink-0">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_290px_1fr] gap-4 flex-1 min-h-0">
        {/* Jobs */}
        <Card className={`flex-col min-h-0 ${activeId ? 'hidden lg:flex' : 'flex'}`} padded={false}>
          <div className="p-3 border-b border-border-subtle shrink-0">
            <h3 className="text-sm font-bold text-text-primary">Your jobs</h3>
          </div>
          <div className="p-2 flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
            {jobs.map((j) => {
              const on = String(j.jobId) === String(jobId);
              return (
                <button
                  key={j.jobId}
                  onClick={() => pickJob(j.jobId)}
                  className={`text-left w-full p-2.5 rounded-input border transition-colors ${
                    on ? 'bg-brand-muted border-brand-green/40'
                       : 'bg-bg-surface border-border-subtle hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary line-clamp-2">{j.title}</span>
                    {j.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center rounded-pill
                        bg-brand-green text-brand-ink text-[11px] font-bold">{j.unreadCount}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    {j.applicantCount} applicant{j.applicantCount === 1 ? '' : 's'}
                    {j.conversationCount > 0 && ` · ${j.conversationCount} talking`}
                  </p>
                  {j.awaitingAcceptance > 0 && (
                    <p className="text-[11px] text-accent-ochreInk mt-0.5">
                      {j.awaitingAcceptance} waiting for you to accept
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Candidates on the selected job */}
        <Card className={`flex-col min-h-0 ${activeId ? 'hidden lg:flex' : 'flex'}`} padded={false}>
          <div className="p-3 border-b border-border-subtle shrink-0">
            <h3 className="text-sm font-bold text-text-primary truncate">
              {job ? job.title : 'Pick a job'}
            </h3>
            {job && (
              <p className="text-[11px] text-text-muted mt-0.5">
                <MapPin size={10} className="inline" /> {job.city || '—'} · {job.employmentType}
              </p>
            )}
          </div>

          <div className="p-2 flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
            {!job || job.threads.length === 0 ? (
              <p className="text-sm text-text-muted text-center my-auto px-3">
                Nobody has applied to this job yet.
              </p>
            ) : job.threads.map((t) => {
              const on = String(t.applicationId) === String(activeId);
              return (
                <button
                  key={t.applicationId}
                  onClick={() => openThread(t.applicationId)}
                  className={`text-left w-full p-2.5 rounded-input border transition-colors ${
                    on ? 'bg-brand-muted border-brand-green/40'
                       : 'bg-bg-surface border-border-subtle hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">{t.candidateName}</span>
                    <span className={`text-[11px] font-bold tabular-nums shrink-0 ${scoreTone(t.matchScore)}`}>
                      {t.matchScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {t.lastMessage
                      ? `${t.lastMessage.fromMe ? 'You: ' : ''}${t.lastMessage.content}`
                      : 'No messages yet'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant={STATUS_VARIANT[t.status] || 'neutral'} className="capitalize">{t.status}</Badge>
                    {t.awaitingAcceptance && <Badge variant="warning">Awaiting you</Badge>}
                    {t.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-pill
                        bg-brand-green text-brand-ink text-[10px] font-bold">{t.unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Conversation */}
        <Card className={`min-h-0 ${activeId ? 'flex' : 'hidden lg:flex'} flex-col`}>
          {!thread ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-text-muted">
              <MessageSquare size={30} />
              <p className="text-sm">Pick a candidate to read the conversation.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center gap-3 pb-4 border-b border-border-subtle shrink-0">
                <button
                  onClick={() => { setActiveId(null); setParams({ job: jobId }, { replace: true }); }}
                  className="lg:hidden p-1.5 -ml-1 rounded-btn text-text-secondary hover:bg-bg-elevated"
                  aria-label="Back to candidates"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate">{thread.candidateName}</p>
                  <p className="text-xs text-text-secondary truncate">
                    <Briefcase size={11} className="inline" /> {job?.title}
                    {thread.candidateCity ? ` · ${thread.candidateCity}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${scoreTone(thread.matchScore)}`}>
                  {thread.matchScore}%
                </span>
              </div>

              {!accepted && (
                <div className="flex items-start gap-3 mt-4 p-3 rounded-input bg-accent-ochreMuted border border-accent-ochre/35 shrink-0">
                  <Lock size={15} className="text-accent-ochreInk shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-accent-ochreInk leading-relaxed">
                      {thread.awaitingAcceptance
                        ? `${thread.candidateName.split(' ')[0]} has sent an introduction and cannot write again until you accept.`
                        : 'This candidate may send one introduction. Accepting opens the conversation both ways.'}
                    </p>
                    <Button variant="deep" className="h-8 text-xs mt-2.5 gap-1.5" onClick={accept}>
                      <Check size={13} /> Accept and open chat
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-text-muted text-center my-auto">
                    No messages yet. You can write first.
                  </p>
                ) : messages.map((m) => {
                  const fromCandidate = String(m.sender) === String(thread.candidateId);
                  return (
                    <div key={m._id} className={`flex ${fromCandidate ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[78%] px-3.5 py-2.5 rounded-card ${
                        fromCandidate
                          ? 'bg-bg-elevated text-text-primary border border-border-subtle'
                          : 'bg-brand-deep text-text-inverse'
                      }`}>
                        {m.isAutomated && (
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                            fromCandidate ? 'text-text-muted' : 'text-text-onDeepDim'}`}>
                            Automated update
                          </p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
                        <p className={`text-[11px] mt-1 ${fromCandidate ? 'text-text-muted' : 'text-text-onDeepDim'}`}>
                          {stamp(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="flex gap-2 pt-4 border-t border-border-subtle shrink-0">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={connected ? 'Write a message...' : 'Connecting...'}
                  disabled={!connected}
                  className="flex-1 h-input px-4 bg-bg-surface border border-border-subtle rounded-input
                    text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green
                    focus:ring-4 focus:ring-brand-green/18 disabled:opacity-60"
                />
                <Button type="submit" variant="primary" disabled={!connected || !draft.trim()}>
                  <Send size={16} />
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
