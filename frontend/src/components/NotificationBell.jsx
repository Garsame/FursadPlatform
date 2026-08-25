import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Bell, CheckCheck, X, Briefcase, MessageSquare, FileText, Building2,
  ShieldCheck, Sparkles, XCircle,
} from 'lucide-react';
import api, { getPortalToken } from '../services/api';

const ICONS = {
  application_status: FileText,
  new_message: MessageSquare,
  chat_accepted: MessageSquare,
  job_match: Sparkles,
  new_employer: Building2,
  job_closed: XCircle,
  new_application: FileText,
  job_decision: ShieldCheck,
};

const TONES = {
  job_match: 'text-brand-green bg-brand-muted',
  new_employer: 'text-brand-deep bg-brand-muted',
  new_message: 'text-info bg-info/10',
  chat_accepted: 'text-info bg-info/10',
  new_application: 'text-brand-deep bg-brand-muted',
  application_status: 'text-accent-ochreInk bg-accent-ochreMuted',
  job_decision: 'text-accent-ochreInk bg-accent-ochreMuted',
  job_closed: 'text-danger bg-danger/10',
};

const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

/**
 * The bell, shared by every portal.
 *
 * Two sources feed it: a fetch on mount for whatever happened while the person
 * was away, and a socket subscription for whatever happens while they are
 * here. Notifications are stored server-side, so closing the tab never loses
 * one.
 *
 * Opening an item marks it read and navigates to its `link`, which is the
 * point of the feature — a notification that only tells you something happened
 * leaves you to go and find it yourself.
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=15');
      if (res.data?.success) {
        setItems(res.data.data);
        setUnread(res.data.unreadCount);
      }
    } catch {
      /* a bell that cannot load is not worth an error message */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Live arrivals */
  useEffect(() => {
    const token = getPortalToken();
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    socket.on('notification:new', (n) => {
      setItems((prev) => [n, ...prev].slice(0, 15));
      setUnread((prev) => prev + 1);
    });

    return () => socket.disconnect();
  }, []);

  /* Click-away and Escape */
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((prev) => Math.max(0, prev - 1));
      api.put(`/notifications/${n._id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    api.put('/notifications/read-all').catch(() => {});
  };

  const dismiss = async (e, id) => {
    e.stopPropagation();
    const wasUnread = items.find((x) => x._id === id && !x.isRead);
    setItems((prev) => prev.filter((x) => x._id !== id));
    if (wasUnread) setUnread((prev) => Math.max(0, prev - 1));
    api.delete(`/notifications/${id}`).catch(() => {});
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative h-9 w-9 grid place-items-center rounded-btn text-text-secondary
          hover:text-text-primary hover:bg-bg-elevated transition-colors"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center
            rounded-pill bg-brand-green text-brand-ink text-[10px] font-bold border-2 border-bg-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[360px] max-w-[calc(100vw-2rem)] bg-bg-surface
          border border-border-subtle rounded-card shadow-lift z-50 overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary">
              Notifications {unread > 0 && <span className="text-text-muted font-medium">· {unread} new</span>}
            </h3>
            {unread > 0 && (
              <button onClick={markAll}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-deep hover:underline">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">Loading…</p>
            ) : items.length === 0 ? (
              <div className="text-center py-10 px-6">
                <span className="w-12 h-12 rounded-full bg-bg-elevated grid place-items-center mx-auto text-text-muted">
                  <Bell size={20} />
                </span>
                <p className="text-sm font-semibold text-text-primary mt-3">Nothing yet</p>
                <p className="text-xs text-text-muted mt-1">
                  Updates about your jobs, applications and messages will appear here.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] || Briefcase;
                return (
                  <button
                    key={n._id}
                    onClick={() => openItem(n)}
                    className={`group w-full text-left flex items-start gap-3 px-4 py-3 border-b
                      border-border-subtle last:border-0 transition-colors hover:bg-bg-elevated
                      ${n.isRead ? '' : 'bg-brand-muted/40'}`}
                  >
                    <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${TONES[n.type] || 'text-text-secondary bg-bg-elevated'}`}>
                      <Icon size={15} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className={`block text-sm leading-snug ${n.isRead ? 'text-text-secondary font-medium' : 'text-text-primary font-semibold'}`}>
                          {n.title}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-green shrink-0 mt-1.5" />}
                      </span>
                      {n.body && (
                        <span className="block text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</span>
                      )}
                      <span className="block text-[11px] text-text-muted mt-1">{ago(n.createdAt)}</span>
                    </span>

                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label="Dismiss"
                      onClick={(e) => dismiss(e, n._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded
                        text-text-muted hover:text-danger shrink-0"
                    >
                      <X size={13} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
