import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'remote'];
const EDUCATION_LEVELS = ['', 'High School', 'Diploma', 'Bachelor', 'Master', 'PhD'];
const EXPERIENCE_LEVELS = ['', 'entry', 'mid', 'senior', 'lead', 'executive'];

const selectClass =
  'w-full h-input px-4 bg-bg-surface border border-border-subtle rounded-input text-text-primary ' +
  'focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/18 capitalize';

/**
 * Editing a live vacancy.
 *
 * PUT /api/jobs/:id has always supported this; there was simply no screen, so a
 * typo in a published salary was permanent. Republishing a job that is not
 * currently published re-runs the AI fraud screen server-side, which is why the
 * save handler has to be ready for the status to come back as pending_review
 * rather than published.
 */
const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/jobs/${id}`);
        const j = res.data?.data;
        if (!j) throw new Error('Job not found');

        setStatus(j.status);
        setForm({
          title: j.title || '',
          description: j.description || '',
          skillsStr: (j.skillsRequired || []).join(', '),
          city: j.location?.city || '',
          country: j.location?.country || '',
          salaryMin: j.salaryRange?.min ?? 0,
          salaryMax: j.salaryRange?.max ?? 0,
          educationLevel: j.educationLevel || '',
          experienceLevel: j.experienceLevel || '',
          employmentType: j.employmentType || 'full-time'
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this job.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async (nextStatus) => {
    setError('');
    setNotice('');

    if (!form.title.trim() || !form.description.trim()) {
      return setError('A title and description are both required.');
    }
    if (Number(form.salaryMax) > 0 && Number(form.salaryMin) > Number(form.salaryMax)) {
      return setError('The minimum salary cannot be higher than the maximum.');
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        skillsRequired: form.skillsStr.split(',').map((s) => s.trim()).filter(Boolean),
        location: { city: form.city.trim(), country: form.country.trim() },
        salaryRange: { min: Number(form.salaryMin) || 0, max: Number(form.salaryMax) || 0, currency: 'USD' },
        educationLevel: form.educationLevel,
        experienceLevel: form.experienceLevel,
        employmentType: form.employmentType
      };
      if (nextStatus) payload.status = nextStatus;

      const res = await api.put(`/jobs/${id}`, payload);
      if (res.data?.success) {
        setStatus(res.data.data.status);
        setNotice(res.data.message || 'Job updated.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green" />
      </div>
    );
  }

  if (!form) {
    return (
      <Card className="text-center py-12">
        <p className="text-text-secondary">{error || 'This job could not be loaded.'}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/provider/jobs')}>
          Back to my jobs
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/provider/jobs')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-brand-deep"
        >
          <ArrowLeft size={16} /> Back to my jobs
        </button>
        <Badge
          variant={status === 'published' ? 'success' : status === 'pending_review' ? 'warning' : 'neutral'}
          className="capitalize"
        >
          {status === 'pending_review' ? 'Pending review' : status}
        </Badge>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/25 rounded-input p-3">
          <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2.5 bg-success/10 border border-success/25 rounded-input p-3">
          <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
          <p className="text-sm text-success">{notice}</p>
        </div>
      )}

      <Card className="flex flex-col gap-5">
        <Input
          label="Job title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-text-primary">Description</label>
          <textarea
            rows={10}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full p-4 bg-bg-surface border border-border-subtle rounded-input text-text-primary
              leading-relaxed focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/18"
          />
        </div>

        <Input
          label="Required skills"
          hint="Comma separated"
          value={form.skillsStr}
          onChange={(e) => set('skillsStr', e.target.value)}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            type="number"
            label="Salary minimum (USD)"
            value={form.salaryMin}
            onChange={(e) => set('salaryMin', e.target.value)}
          />
          <Input
            type="number"
            label="Salary maximum (USD)"
            value={form.salaryMax}
            onChange={(e) => set('salaryMax', e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Employment type</label>
            <select
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value)}
              className={selectClass}
            >
              {EMPLOYMENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Education</label>
            <select
              value={form.educationLevel}
              onChange={(e) => set('educationLevel', e.target.value)}
              className={selectClass}
            >
              {EDUCATION_LEVELS.map((v) => <option key={v} value={v}>{v || 'Any'}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Experience</label>
            <select
              value={form.experienceLevel}
              onChange={(e) => set('experienceLevel', e.target.value)}
              className={selectClass}
            >
              {EXPERIENCE_LEVELS.map((v) => <option key={v} value={v}>{v || 'Any'}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => save(null)} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
        </Button>

        {status === 'published' ? (
          <Button variant="secondary" onClick={() => save('closed')} disabled={saving}>
            Close this job
          </Button>
        ) : (
          <Button variant="deep" onClick={() => save('published')} disabled={saving}>
            Submit for review
          </Button>
        )}

        <p className="text-xs text-text-muted max-w-md">
          {status === 'published'
            ? 'Editing a live job sends it back for approval. Closing removes it from search, and applications already received are kept.'
            : 'An administrator reviews every job before it goes live. You will be emailed as soon as a decision is made.'}
        </p>
      </div>
    </div>
  );
};

export default EditJob;
