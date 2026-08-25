import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Mail, Search, Trash2, Check, Clock, Inbox, MailWarning, User as UserIcon,
} from 'lucide-react';

const STATUS = {
  new: { label: 'New', variant: 'warning', icon: MailWarning },
  in_progress: { label: 'In progress', variant: 'info', icon: Clock },
  resolved: { label: 'Resolved', variant: 'success', icon: Check },
};

const TABS = [
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: '', label: 'All' },
];

const when = (d) => new Date(d).toLocaleString([], {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

/**
 * Enquiries from the public contact form.
 *
 * These used to be emailed and nothing else, so nobody could tell what had
 * already been answered and a failed send lost the message entirely. Now they
 * queue here, and taking one records who took it.
 */
const Contact = () => {
  const [items, setItems] = useState([]);
  const [byStatus, setByStatus] = useState({});
  const [tab, setTab] = useState('new');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState({});

  const load = async () => {
    try {
      const res = await api.get('/admin/contact');
      if (res.data?.success) {
        setItems(res.data.data);
        setByStatus(res.data.byStatus || {});
      }
    } catch {
      setNotice('Could not load enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (item, status) => {
    setBusy(item._id);
    try {
      const res = await api.put(`/admin/contact/${item._id}`, {
        status,
        ...(notes[item._id] !== undefined ? { adminNote: notes[item._id] } : {}),
      });
      if (res.data?.success) { setNotice(res.data.message); await load(); }
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not update that enquiry.');
    } finally { setBusy(null); }
  };

  const remove = async (item) => {
    setBusy(item._id);
    try {
      await api.delete(`/admin/contact/${item._id}`);
      setItems((prev) => prev.filter((x) => x._id !== item._id));
      setNotice('Enquiry deleted.');
    } catch {
      setNotice('Could not delete that enquiry.');
    } finally { setBusy(null); }
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((i) => (tab ? i.status === tab : true))
      .filter((i) => !term || [i.name, i.email, i.subject, i.message]
        .some((f) => (f || '').toLowerCase().includes(term)));
  }, [items, tab, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <div className="bg-success/10 border border-success/25 text-success rounded-input p-3 text-sm">{notice}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const count = t.key ? (byStatus[t.key] ?? 0) : items.length;
            const on = tab === t.key;
            return (
              <button
                key={t.key || 'all'}
                onClick={() => setTab(t.key)}
                className={`px-3.5 h-9 rounded-btn text-sm font-semibold border transition-colors ${
                  on ? 'bg-brand-deep text-text-inverse border-brand-deep'
                     : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-strong'}`}
              >
                {t.label}
                <span className={`ml-2 text-xs tabular-nums ${on ? 'text-text-onDeepDim' : 'text-text-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or message"
            className="h-9 pl-9 pr-4 w-72 bg-bg-surface border border-border-subtle rounded-input text-sm
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="text-center py-2xl flex flex-col items-center gap-3">
          <div className="p-4 bg-bg-elevated rounded-full text-text-muted"><Inbox size={28} /></div>
          <h3 className="font-bold text-text-primary">
            {tab === 'new' ? 'No new enquiries' : 'Nothing here'}
          </h3>
          <p className="text-sm text-text-secondary max-w-sm">
            Messages sent through the public contact form arrive here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((item) => {
            const meta = STATUS[item.status] || STATUS.new;
            const Icon = meta.icon;
            return (
              <Card key={item._id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-primary">
                        {item.subject || 'No subject'}
                      </h3>
                      <Badge variant={meta.variant}><Icon size={10} /> {meta.label}</Badge>
                      {item.senderUser && (
                        <Badge variant="neutral">
                          <UserIcon size={10} /> {item.senderUser.role} on Fursad
                        </Badge>
                      )}
                      {!item.emailDelivered && <Badge variant="danger">Email not delivered</Badge>}
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      <strong className="text-text-primary">{item.name}</strong> · {item.email} · {when(item.createdAt)}
                    </p>
                  </div>

                  <a
                    href={`mailto:${item.email}?subject=${encodeURIComponent('Re: ' + (item.subject || 'Your message to Fursad'))}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-btn text-sm font-semibold
                      text-brand-deep hover:bg-bg-elevated transition-colors shrink-0"
                  >
                    <Mail size={14} /> Reply by email
                  </a>
                </div>

                <div className="bg-bg-primary border border-border-subtle rounded-input p-3.5
                  text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                  {item.message}
                </div>

                {item.handledBy && (
                  <p className="text-[11px] text-text-muted">
                    Taken by {item.handledBy.name}
                    {item.handledAt ? ` · ${when(item.handledAt)}` : ''}
                  </p>
                )}

                <input
                  value={notes[item._id] ?? item.adminNote ?? ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [item._id]: e.target.value }))}
                  placeholder="Internal note — what was done about this"
                  className="w-full h-10 px-3.5 bg-bg-primary border border-border-subtle rounded-input
                    text-sm text-text-primary placeholder:text-text-muted focus:outline-none
                    focus:border-brand-green"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle">
                  {item.status !== 'in_progress' && (
                    <Button variant="secondary" className="h-9 text-xs gap-1.5 mt-3"
                            disabled={busy === item._id} onClick={() => setStatus(item, 'in_progress')}>
                      <Clock size={13} /> Take this
                    </Button>
                  )}
                  {item.status !== 'resolved' && (
                    <Button variant="primary" className="h-9 text-xs gap-1.5 mt-3"
                            disabled={busy === item._id} onClick={() => setStatus(item, 'resolved')}>
                      <Check size={13} /> Mark resolved
                    </Button>
                  )}
                  {item.status === 'resolved' && (
                    <Button variant="ghost" className="h-9 text-xs mt-3"
                            disabled={busy === item._id} onClick={() => setStatus(item, 'new')}>
                      Reopen
                    </Button>
                  )}
                  <button
                    onClick={() => remove(item)}
                    disabled={busy === item._id}
                    aria-label="Delete enquiry"
                    className="h-9 w-9 grid place-items-center rounded-btn text-danger hover:bg-danger/10
                      transition-colors mt-3 ml-auto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Contact;
