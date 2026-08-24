import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MessageSquare, Send, ArrowLeft, Inbox, Lock } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import CompanyLogo from '../../components/CompanyLogo';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const STATUS_VARIANT = {
  applied: 'neutral',
  reviewed: 'info',
  shortlisted: 'brand',
  interview: 'warning',
  offer: 'success',
  hired: 'success',
  rejected: 'danger'
};

const timeOf = (d) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const dayOf = (d) => {
  const date = new Date(d);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay ? timeOf(d) : date.toLocaleDateString();
};

/**
 * The candidate's half of messaging.
 *
 * Employers already had a chat drawer; candidates had no screen at all, so
 * every message an employer sent went into a thread the person it was addressed
 * to could never open. The socket layer, the Message model and the room
 * authorisation all existed already — this is the missing surface, not a new
 * system.
 *
 * One socket for the page rather than one per thread. Switching threads joins
 * another room without leaving the last, so arriving messages are matched
 * against the open thread and otherwise counted as unread in the list.
 */
const Messages = () => {
  const [params, setParams] = useSearchParams();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(params.get('application') || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  // Sent by the server on join and whenever it changes. The browser never
  // decides this for itself.
  const [convState, setConvState] = useState(null);

  const socketRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const endRef = useRef(null);

  // Handlers registered once on the socket read this instead of closing over
  // the activeId from the render they were created in.
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const active = useMemo(
    () => threads.find((t) => String(t.applicationId) === String(activeId)) || null,
    [threads, activeId]
  );

  const scrollDown = () => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ------------------------------------------------------------- threads */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/applications/threads');
        if (res.data?.success) setThreads(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load your messages.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* -------------------------------------------------------------- socket */
  useEffect(() => {
    const token = localStorage.getItem('fursad_jobseeker_token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (e) => setError(`Chat connection failed: ${e.message}`));

    socket.on('previousMessages', (prev) => {
      setMessages(prev);
      scrollDown();
    });

    socket.on('conversationState', (state) => {
      if (String(state.applicationId) === String(activeIdRef.current)) setConvState(state);
      setThreads((prev) =>
        prev.map((t) =>
          String(t.applicationId) === String(state.applicationId)
            ? { ...t, messagingAccepted: state.accepted, canSend: state.candidateCanSend, openerUsed: state.candidateOpenerUsed }
            : t
        )
      );
    });

    socket.on('messageBlocked', (info) => {
      setError(info.message);
      setConvState((prev) => (prev ? { ...prev, candidateCanSend: false, candidateOpenerUsed: true } : prev));
    });

    socket.on('newMessage', (msg) => {
      const isOpenThread = String(msg.application) === String(activeIdRef.current);

      // Update the list for every thread, the open one included — otherwise a
      // thread reads "No messages yet" in the list while its messages sit
      // visible beside it.
      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (String(t.applicationId) !== String(msg.application)) return t;
          // Only two people post here, so anything not from the employer is us.
          const fromMe = String(msg.sender) !== String(t.employerUserId);
          return {
            ...t,
            unreadCount: isOpenThread || fromMe ? t.unreadCount : t.unreadCount + 1,
            lastMessage: { content: msg.content, createdAt: msg.createdAt, fromMe }
          };
        })
      );

      if (isOpenThread) {
        setMessages((prevMsgs) => [...prevMsgs, msg]);
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

    setThreads((prev) =>
      prev.map((t) => (String(t.applicationId) === String(activeId) ? { ...t, unreadCount: 0 } : t))
    );
  }, [activeId, connected]);

  const openThread = (id) => {
    setActiveId(id);
    setParams({ application: id }, { replace: true });
    setError('');
  };

  const handleSend = (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !active || !socketRef.current) return;

    socketRef.current.emit('sendMessage', {
      applicationId: active.applicationId,
      recipientId: active.employerUserId,
      content
    });

    setDraft('');
  };

  /* --------------------------------------------------------------- views */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  if (!threads.length) {
    return (
      <Card className="text-center py-2xl flex flex-col items-center gap-3">
        <div className="p-4 bg-bg-elevated rounded-full text-text-muted"><Inbox size={28} /></div>
        <h3 className="font-bold text-text-primary">No conversations yet</h3>
        <p className="text-sm text-text-secondary max-w-sm">
          Once you apply to a job, you and that employer can message each other here.
        </p>
      </Card>
    );
  }

  const ThreadList = (
    <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
      {threads.map((t) => {
        const isActive = String(t.applicationId) === String(activeId);
        return (
          <button
            key={t.applicationId}
            onClick={() => openThread(t.applicationId)}
            className={`text-left w-full p-3 rounded-card border transition-all duration-200 ${
              isActive
                ? 'bg-brand-muted border-brand-green/40'
                : 'bg-bg-surface border-border-subtle hover:border-border-strong hover:bg-bg-elevated'
            }`}
          >
            <div className="flex items-start gap-3">
              <CompanyLogo
                name={t.companyName}
                logoUrl={t.companyLogoUrl ? `${API_ORIGIN}${t.companyLogoUrl}` : ''}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{t.companyName}</p>
                  {t.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 grid place-items-center rounded-pill
                      bg-brand-green text-brand-ink text-[11px] font-bold">
                      {t.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary truncate">{t.jobTitle}</p>
                <p className="text-xs text-text-muted truncate mt-1">
                  {t.lastMessage
                    ? `${t.lastMessage.fromMe ? 'You: ' : ''}${t.lastMessage.content}`
                    : 'No messages yet'}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // Server state wins; the thread record is the fallback until the socket
  // reports in, so the composer never flashes the wrong permission.
  const accepted = convState ? convState.accepted : !!active?.messagingAccepted;
  const canSend = convState ? convState.candidateCanSend : (active?.canSend ?? true);

  const Conversation = active ? (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 pb-4 border-b border-border-subtle shrink-0">
        <button
          onClick={() => { setActiveId(null); setParams({}, { replace: true }); }}
          className="lg:hidden p-1.5 -ml-1 rounded-btn text-text-secondary hover:bg-bg-elevated"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={18} />
        </button>
        <CompanyLogo
          name={active.companyName}
          logoUrl={active.companyLogoUrl ? `${API_ORIGIN}${active.companyLogoUrl}` : ''}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-primary truncate">{active.companyName}</p>
          <p className="text-xs text-text-secondary truncate">{active.jobTitle}</p>
        </div>
        <Badge variant={STATUS_VARIANT[active.status] || 'neutral'} className="capitalize">
          {active.status}
        </Badge>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted text-center my-auto">
            No messages in this conversation yet. Say hello.
          </p>
        ) : (
          messages.map((m) => {
            const fromEmployer = String(m.sender) === String(active.employerUserId);
            return (
              <div key={m._id} className={`flex ${fromEmployer ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-card ${
                    fromEmployer
                      ? 'bg-bg-elevated text-text-primary border border-border-subtle'
                      : 'bg-brand-deep text-text-inverse'
                  }`}
                >
                  {m.isAutomated && (
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      fromEmployer ? 'text-text-muted' : 'text-text-onDeepDim'}`}>
                      Automated update
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-line">{m.content}</p>
                  <p className={`text-[11px] mt-1 ${fromEmployer ? 'text-text-muted' : 'text-text-onDeepDim'}`}>
                    {dayOf(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="pt-4 border-t border-border-subtle shrink-0">
        {canSend ? (
          <>
            {!accepted && (
              <p className="flex items-start gap-1.5 text-[11px] text-text-muted mb-2">
                <Lock size={11} className="shrink-0 mt-0.5" />
                You can send one introduction. {active.companyName} needs to accept it before you can
                write again — so make this one count.
              </p>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
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
          </>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-input bg-bg-elevated border border-border-subtle">
            <Lock size={15} className="text-text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Your introduction has been sent to {active.companyName}. You will be able to reply here
              as soon as they accept it.
            </p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-text-muted">
      <MessageSquare size={30} />
      <p className="text-sm">Pick a conversation to read it.</p>
    </div>
  );

  return (
    // Fills the dashboard's scroll region: viewport less the 72px header and
    // the main padding, so the thread list and conversation scroll internally
    // rather than the page growing past the fold.
    <div className="flex flex-col gap-4 h-[calc(100vh-112px)] sm:h-[calc(100vh-136px)] min-h-[520px]">
      {error && (
        <div className="bg-danger/8 border border-danger/25 text-danger rounded-input p-3 text-sm shrink-0">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <Card className={`flex-col min-h-0 ${activeId ? 'hidden lg:flex' : 'flex'}`} padded={false}>
          <div className="p-3 border-b border-border-subtle shrink-0">
            <h3 className="text-sm font-bold text-text-primary">Conversations</h3>
          </div>
          <div className="p-3 flex-1 min-h-0 overflow-y-auto">{ThreadList}</div>
        </Card>

        <Card className={`min-h-0 ${activeId ? 'flex' : 'hidden lg:flex'} flex-col`}>
          {Conversation}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
