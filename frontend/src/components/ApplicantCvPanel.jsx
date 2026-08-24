import React, { useEffect, useState } from 'react';
import { FileText, Download, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../services/api';
import Badge from './ui/Badge';

const prettySize = (b = 0) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`;

/**
 * CVs belonging to one applicant, downloadable by the employer who received the
 * application. The CV that was actually submitted is marked, because that is
 * the document the match score was computed from.
 */
const ApplicantCvPanel = ({ userId, submittedCvId }) => {
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/cvs/candidate/${userId}`);
        if (res.data?.success) setCvs(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load CVs.');
      } finally { setLoading(false); }
    })();
  }, [userId]);

  const download = async (cv) => {
    setBusy(cv._id);
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
      setError('Could not download that file.');
    } finally { setBusy(null); }
  };

  if (loading) return <div className="h-16 rounded-input bg-bg-elevated animate-pulse" />;

  if (error) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <AlertTriangle size={14} /> {error}
      </p>
    );
  }

  if (!cvs.length) {
    return <p className="text-sm text-text-muted">This candidate has not uploaded a CV.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {cvs.map((cv) => {
        const submitted = String(cv._id) === String(submittedCvId);
        return (
          <div
            key={cv._id}
            className={`flex items-center gap-3 p-3 rounded-input border transition-colors ${
              submitted ? 'border-brand-green/45 bg-brand-muted' : 'border-border-subtle bg-bg-primary'
            }`}
          >
            <span className="w-9 h-9 rounded-lg bg-bg-surface border border-border-subtle grid place-items-center shrink-0">
              <FileText size={16} className="text-brand-deep" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-text-primary truncate">{cv.label}</span>
                {submitted && <Badge variant="brand">Submitted with this application</Badge>}
                {cv.parseStatus === 'parsed' && (
                  <Badge variant="success"><Sparkles size={10} /> Analysed</Badge>
                )}
              </div>
              <p className="text-[11px] text-text-muted truncate">
                {cv.originalName} · {prettySize(cv.sizeBytes)}
              </p>
            </div>

            <button
              onClick={() => download(cv)}
              disabled={busy === cv._id}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-btn text-sm font-semibold
                text-brand-deep hover:bg-bg-elevated transition-colors shrink-0 disabled:opacity-50"
            >
              {busy === cv._id
                ? <Loader2 size={15} className="animate-spin" />
                : <Download size={15} />}
              Download
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ApplicantCvPanel;
