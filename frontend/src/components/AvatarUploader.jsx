import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import api from '../services/api';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/** Profile photo with click-to-replace. Falls back to initials when unset. */
const AvatarUploader = ({ profile, onUploaded, onError }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const name = profile?.user?.name || '';
  const initials =
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'JS';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const form = new FormData();
      form.append('image', file);
      // No explicit Content-Type: the request interceptor strips it so the
      // browser can set multipart/form-data with its own boundary.
      const res = await api.post('/profile/avatar', form);
      if (res.data?.success) onUploaded?.(res.data.data.avatarUrl);
    } catch (err) {
      onError?.(err.response?.data?.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => !busy && inputRef.current?.click()}
        className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border-subtle
          bg-brand-deep grid place-items-center group focus-visible:ring-4 focus-visible:ring-brand-green/30"
        aria-label="Change profile photo"
      >
        {profile?.avatarUrl ? (
          <img
            src={`${API_ORIGIN}${profile.avatarUrl}`}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-text-inverse">{initials}</span>
        )}

        <span className="absolute inset-0 bg-brand-deeper/65 opacity-0 group-hover:opacity-100
          transition-opacity grid place-items-center">
          {busy
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <Camera size={22} className="text-white" />}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      <p className="text-[11px] text-text-muted text-center mt-2">JPG, PNG · 2 MB</p>
    </div>
  );
};

export default AvatarUploader;
