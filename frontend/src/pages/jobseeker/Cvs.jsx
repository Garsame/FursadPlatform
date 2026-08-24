import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud, FileText, Star, Download, Trash2, Sparkles,
  AlertTriangle, CheckCircle2, Target, Lock,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const prettySize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Cvs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [label, setLabel] = useState('');
  const [notice, setNotice] = useState(null);   // { type, text }
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/cvs');
      if (res.data?.success) setCvs(res.data.data);
    } catch {
      setCvs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (label.trim()) form.append('label', label.trim());

      // Let the browser set the multipart boundary itself.
      const res = await api.post('/cvs', form);

      if (res.data?.success) {
        setNotice({
          type: res.data.data.parseStatus === 'parsed' ? 'success' : 'warning',
          text: res.data.message,
        });
        setLabel('');
        await load();
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const makePrimary = async (id) => {
    await api.put(`/cvs/${id}/primary`);
    load();
  };

  const download = async (cv) => {
    // Authorised route, so fetch as a blob with the JWT attached rather than
    // opening a bare URL.
    try {
      const res = await api.get(`/cvs/${cv._id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = cv.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setNotice({ type: 'error', text: 'Could not download that file.' });
    }
  };

  const confirmDelete = async () => {
    try {
      const res = await api.delete(`/cvs/${pendingDelete._id}`);
      if (res.data?.success) { setPendingDelete(null); load(); }
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Delete failed.' });
      setPendingDelete(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-text-primary">{t('cvs.title')}</h1>
        <p className="text-text-secondary mt-2 max-w-prose">{t('cvs.sub')}</p>
      </header>

      {notice && (
        <div className={`flex items-start gap-2.5 rounded-input p-3.5 mb-6 border ${
          notice.type === 'success' ? 'bg-brand-muted border-brand-green/30 text-text-primary'
          : notice.type === 'warning' ? 'bg-accent-ochreMuted border-accent-ochre/40 text-text-primary'
          : 'bg-danger/8 border-danger/25 text-danger'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 size={17} className="text-success shrink-0 mt-0.5" />
            : <AlertTriangle size={17} className="shrink-0 mt-0.5" />}
          <p className="text-sm">{notice.text}</p>
        </div>
      )}

      {/* ------------------------------------------------------- Uploader */}
      <div className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-6 mb-8">
        <label className="text-sm font-semibold text-text-primary">{t('cvs.label_field')}</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('cvs.label_ph')}
          className="w-full h-input px-4 mt-1.5 bg-bg-primary border border-border-subtle rounded-input
            text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green
            focus:ring-4 focus:ring-brand-green/18 transition-all"
        />
        <p className="text-xs text-text-muted mt-1.5">{t('cvs.label_hint')}</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`mt-5 rounded-card border-2 border-dashed px-6 py-10 text-center cursor-pointer
            transition-all duration-200 ${
              dragging ? 'border-brand-green bg-brand-muted'
              : 'border-border-strong hover:border-brand-green hover:bg-bg-elevated'
            } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <span className="w-14 h-14 rounded-2xl bg-brand-muted grid place-items-center mx-auto">
            <UploadCloud size={26} className="text-brand-deep" />
          </span>
          <p className="font-semibold text-text-primary mt-4">
            {uploading ? t('cvs.uploading') : t('cvs.drop_title')}
          </p>
          <p className="text-sm text-text-muted mt-1">{t('cvs.drop_sub')}</p>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* ------------------------------------------------------- CV list */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => <div key={i} className="h-32 rounded-card bg-bg-elevated animate-pulse" />)}
        </div>
      ) : cvs.length === 0 ? (
        <div className="text-center py-2xl border border-dashed border-border-strong rounded-card bg-bg-surface">
          <span className="w-16 h-16 rounded-2xl bg-bg-elevated grid place-items-center mx-auto">
            <FileText size={26} className="text-text-muted" />
          </span>
          <h3 className="font-bold text-lg text-text-primary mt-5">{t('cvs.empty_title')}</h3>
          <p className="text-sm text-text-secondary mt-2 max-w-sm mx-auto">{t('cvs.empty_sub')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {cvs.map((cv) => (
            <div key={cv._id} className="bg-bg-surface border border-border-subtle rounded-card shadow-card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <span className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${
                  cv.parseStatus === 'parsed' ? 'bg-brand-muted' : 'bg-bg-elevated'
                }`}>
                  <FileText size={22} className={cv.parseStatus === 'parsed' ? 'text-brand-deep' : 'text-text-muted'} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-text-primary">{cv.label}</h3>
                    {cv.isPrimary && <Badge variant="brand"><Star size={11} /> {t('cvs.primary')}</Badge>}
                    {cv.parseStatus === 'parsed'
                      ? <Badge variant="success"><Sparkles size={11} /> {t('cvs.parsed')}</Badge>
                      : <Badge variant="warning"><AlertTriangle size={11} /> {t('cvs.parse_failed')}</Badge>}
                  </div>

                  <p className="text-xs text-text-muted mt-1">
                    {cv.originalName} · {prettySize(cv.sizeBytes)} · {t('cvs.uploaded_on')}{' '}
                    {new Date(cv.createdAt).toLocaleDateString()}
                  </p>

                  {cv.parseStatus === 'parsed' && cv.parsed?.skills?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        {t('cvs.skills_found')}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {cv.parsed.skills.slice(0, 8).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-pill bg-bg-elevated border border-border-subtle text-[11px] font-medium text-text-secondary">
                            {s}
                          </span>
                        ))}
                        {cv.parsed.skills.length > 8 && (
                          <span className="px-2 py-0.5 text-[11px] text-text-muted">+{cv.parsed.skills.length - 8}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {cv.parseStatus !== 'parsed' && (
                    <p className="text-xs text-text-secondary mt-2.5 max-w-prose">{t('cvs.parse_failed_hint')}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border-subtle">
                {cv.parseStatus === 'parsed' && (
                  <Button size="sm" variant="primary" onClick={() => navigate(`/dashboard/jobs?cv=${cv._id}`)}>
                    <Target size={15} /> {t('cvs.match_with')}
                  </Button>
                )}
                {!cv.isPrimary && (
                  <Button size="sm" variant="secondary" onClick={() => makePrimary(cv._id)}>
                    <Star size={15} /> {t('cvs.make_primary')}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => download(cv)}>
                  <Download size={15} /> {t('cvs.download')}
                </Button>
                <button
                  onClick={() => setPendingDelete(cv)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-btn text-sm font-medium
                    text-danger hover:bg-danger/8 transition-colors ml-auto"
                >
                  <Trash2 size={15} /> {t('cvs.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('cvs.delete_confirm')}
        subtitle={pendingDelete?.label}
      >
        <p className="text-sm text-text-secondary">{t('cvs.delete_confirm_sub')}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={() => setPendingDelete(null)}>{t('cvs.cancel')}</Button>
          <Button variant="danger" fullWidth onClick={confirmDelete}>{t('cvs.confirm_delete')}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Cvs;
