import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Camera, Sparkles, Save, ExternalLink, Plus, X, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];

const Company = () => {
  const logoRef = useRef(null);
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/companies/mine');
      if (res.data?.success) setC(res.data.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });
  const setLoc = (k) => (e) => setC({ ...c, location: { ...c.location, [k]: e.target.value } });

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true); setNotice(null);
    try {
      const res = await api.put('/companies/mine', {
        name: c.name, tagline: c.tagline, description: c.description, about: c.about,
        industry: c.industry, website: c.website, headquarters: c.headquarters,
        foundedYear: c.foundedYear ? Number(c.foundedYear) : null,
        companySize: c.companySize, location: c.location,
        contactEmail: c.contactEmail, contactPhone: c.contactPhone,
        benefits: c.benefits || [], values: c.values || [],
      });
      if (res.data?.success) {
        setC(res.data.data);
        setNotice({ type: 'success', text: res.data.message });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Could not save.' });
    } finally { setSaving(false); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await api.post('/companies/mine/logo', form);
      if (res.data?.success) setC((p) => ({ ...p, logoUrl: res.data.data.logoUrl, profileCompleteness: res.data.data.profileCompleteness }));
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Logo upload failed.' });
    }
  };

  const draft = async () => {
    setDrafting(true); setNotice(null);
    try {
      const res = await api.post('/companies/mine/generate', { notes: c.about || c.description || '' });
      if (res.data?.success) {
        const d = res.data.data;
        setC((p) => ({
          ...p,
          tagline: d.tagline || p.tagline,
          description: d.description || p.description,
          about: d.about || p.about,
          benefits: d.benefits?.length ? d.benefits : p.benefits,
          values: d.values?.length ? d.values : p.values,
        }));
        setNotice({ type: 'success', text: 'Draft written. Review it, edit anything, then save.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Could not generate a draft.' });
    } finally { setDrafting(false); }
  };

  if (loading) return <div className="h-64 rounded-card bg-bg-elevated animate-pulse max-w-3xl" />;
  if (!c) return <p className="text-text-secondary">No company found.</p>;

  const pct = c.profileCompleteness || 0;

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-text-primary">Company profile</h1>
        <p className="text-text-secondary mt-2 max-w-prose">
          This is what candidates read before they apply. A complete, honest profile is the
          single biggest thing that makes people trust an unfamiliar employer.
        </p>
      </header>

      {notice && (
        <div className={`flex items-start gap-2.5 rounded-input p-3.5 mb-6 border ${
          notice.type === 'success'
            ? 'bg-brand-muted border-brand-green/30 text-text-primary'
            : 'bg-danger/8 border-danger/25 text-danger'
        }`}>
          {notice.type === 'success'
            ? <CheckCircle2 size={17} className="text-success shrink-0 mt-0.5" />
            : <AlertCircle size={17} className="shrink-0 mt-0.5" />}
          <p className="text-sm">{notice.text}</p>
        </div>
      )}

      {/* Identity + completeness */}
      <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6 flex flex-col sm:flex-row gap-6 items-center">
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border-subtle bg-bg-elevated
            grid place-items-center group shrink-0"
          aria-label="Change logo"
        >
          {c.logoUrl
            ? <img src={`${API_ORIGIN}${c.logoUrl}`} alt="" className="w-full h-full object-cover" />
            : <Building2 size={28} className="text-text-muted" />}
          <span className="absolute inset-0 bg-brand-deeper/65 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
            <Camera size={20} className="text-white" />
          </span>
        </button>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />

        <div className="flex-1 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-lg text-text-primary truncate">{c.name}</h2>
            {c.isVerified && <Badge variant="success"><CheckCircle2 size={11} /> Verified</Badge>}
          </div>
          <p className="text-sm text-text-secondary truncate">{c.tagline || 'Add a tagline'}</p>

          <div className="flex justify-between items-center text-sm mt-4">
            <span className="font-semibold text-text-secondary">Profile completeness</span>
            <span className="font-extrabold text-brand-deep">{pct}%</span>
          </div>
          <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden mt-1.5">
            <div className="bg-brand-green h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          {c._id && (
            <Link
              to={`/companies/${c._id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep mt-3 hover:underline"
            >
              View public profile <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button variant="secondary" onClick={draft} disabled={drafting}>
          {drafting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {drafting ? 'Writing…' : 'Draft with AI'}
        </Button>
      </div>

      <form onSubmit={save} className="flex flex-col gap-5 mt-4">
        <Section title="The basics">
          <Input name="name" label="Company name" value={c.name || ''} onChange={set('name')} required />
          <Input name="tagline" label="Tagline" placeholder="One short line"
            value={c.tagline || ''} onChange={set('tagline')} hint="Shown under your name on job cards." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input name="industry" label="Industry" value={c.industry || ''} onChange={set('industry')} />
            <Input name="website" label="Website" placeholder="https://" value={c.website || ''} onChange={set('website')} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input name="city" label="City" value={c.location?.city || ''} onChange={setLoc('city')} />
            <Input name="country" label="Country" value={c.location?.country || ''} onChange={setLoc('country')} />
            <Input name="foundedYear" type="number" label="Founded" placeholder="2002"
              value={c.foundedYear || ''} onChange={set('foundedYear')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Company size</label>
            <select value={c.companySize || ''} onChange={set('companySize')}
              className="h-input px-4 bg-bg-surface border border-border-subtle rounded-input text-text-primary
                focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/18">
              <option value="">Select…</option>
              {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
            </select>
          </div>
        </Section>

        <Section title="What candidates read">
          <TextArea label="Short description" rows={3} value={c.description || ''} onChange={set('description')}
            hint="2-3 sentences. Appears on your job listings." />
          <TextArea label="About the company" rows={7} value={c.about || ''} onChange={set('about')}
            hint="The fuller story — what you do and what it is like to work there." />
        </Section>

        <Section title="Working here">
          <TagList label="Benefits" items={c.benefits || []} placeholder="e.g. Medical cover"
            onChange={(benefits) => setC({ ...c, benefits })} />
          <TagList label="Values" items={c.values || []} placeholder="e.g. Integrity"
            onChange={(values) => setC({ ...c, values })} />
        </Section>

        <Section title="Contact">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input name="contactEmail" type="email" label="Contact email" value={c.contactEmail || ''} onChange={set('contactEmail')} />
            <Input name="contactPhone" label="Contact phone" value={c.contactPhone || ''} onChange={set('contactPhone')} />
          </div>
        </Section>

        <div className="sticky bottom-0 bg-bg-primary/90 backdrop-blur py-4 -mx-1 px-1">
          <Button type="submit" variant="primary" size="lg" disabled={saving}>
            <Save size={17} /> {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};

/* ---------------------------------------------------------------- */

const Section = ({ title, children }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6">
    <h3 className="font-bold text-text-primary mb-4">{title}</h3>
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);

const TextArea = ({ label, rows, value, onChange, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-text-primary">{label}</label>
    <textarea
      rows={rows} value={value} onChange={onChange}
      className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-input text-text-primary
        placeholder:text-text-muted resize-y focus:outline-none focus:border-brand-green
        focus:ring-4 focus:ring-brand-green/18 transition-all leading-relaxed"
    />
    {hint && <span className="text-xs text-text-muted">{hint}</span>}
  </div>
);

const TagList = ({ label, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      <div className="flex flex-wrap gap-2 mb-1">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill
            bg-brand-muted border border-brand-green/25 text-sm text-brand-deep">
            {it}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== it))}
              className="hover:text-danger" aria-label={`Remove ${it}`}>
              <X size={13} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-sm text-text-muted">None added yet.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 h-input px-4 bg-bg-primary border border-border-subtle rounded-input
            text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green"
        />
        <Button type="button" variant="secondary" onClick={add}><Plus size={15} /></Button>
      </div>
    </div>
  );
};

export default Company;
