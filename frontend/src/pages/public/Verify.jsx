import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Spinner } from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { MailCheck } from 'lucide-react';

const Verify = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      return setError('Please enter a valid 6-digit code');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otpCode });
      
      if (res.data && res.data.success) {
        const { token, role } = res.data;
        
        // Segregate tokens depending on the returned user role
        if (role === 'jobseeker') {
          localStorage.setItem('fursad_jobseeker_token', token);
          window.location.href = '/dashboard';
        } else if (role === 'employer') {
          localStorage.setItem('fursad_provider_token', token);
          window.location.href = '/provider/dashboard';
        } else {
          setError('Unexpected user role verified');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Server-side this endpoint is rate limited to a handful of sends per window.
  // The countdown keeps an ordinary user from spending that budget by reflex
  // and hitting a 429 they did nothing to deserve.
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setError('');
    setSuccess('');
    setResending(true);

    try {
      const res = await api.post('/auth/resend-otp', { email });
      setSuccess(res.data?.message || t('auth.otp_resent'));
      setCooldown(60);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response.data?.message || 'Too many requests. Please wait a few minutes.');
        setCooldown(120);
      } else {
        setError(err.response?.data?.message || 'Failed to resend the code. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-bg-primary px-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-brand-green/10 text-brand-green rounded-full mb-4">
            <MailCheck size={36} />
          </div>
          <h2 className="text-2xl font-bold">{t('auth.otp_title')}</h2>
          <p className="text-sm text-text-secondary mt-2">
            We sent a verification code to <span className="text-text-primary font-semibold block">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-btn p-3 text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success/30 text-success rounded-btn p-3 text-sm mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Input
            label={t('auth.otp_code')}
            placeholder="XXXXXX"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.trim())}
            required
            className="text-center font-mono text-xl tracking-[0.5em]"
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {loading ? 'Verifying...' : t('auth.otp_btn')}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-text-secondary">
          {/* A link-styled native button, not the Button component — so the
              spinner is placed by hand. `resending` has to keep disabling it:
              the server allows only 8 outbound emails per 10 minutes, and a
              second click would spend one of them for nothing. */}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            aria-busy={resending || undefined}
            className="inline-flex items-center gap-2 text-brand-deep hover:underline font-semibold
              disabled:text-text-muted disabled:no-underline disabled:cursor-not-allowed"
          >
            {resending && <Spinner size="xs" />}
            {resending
              ? t('auth.otp_resending')
              : cooldown > 0
                ? t('auth.otp_resend_wait', { seconds: cooldown })
                : t('auth.otp_resend')}
          </button>

          <p className="mt-4 text-xs text-text-muted">
            <Link to="/signin" className="hover:text-brand-deep font-medium">
              {t('auth.back_to_signin')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Verify;
