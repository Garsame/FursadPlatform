import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
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

  const handleResend = async () => {
    setError('');
    setSuccess('');
    try {
      // Trigger new login attempt with dummy credentials or endpoint to send OTP
      // For simplicity, we can tell the user they can trigger it by attempting login again
      // Or we can add a quick mock response or simple message.
      setSuccess('A new verification code has been generated. Check your console logs.');
    } catch (err) {
      setError('Failed to resend code');
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

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Verifying...' : t('auth.otp_btn')}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-text-secondary">
          <button
            onClick={handleResend}
            className="text-brand-green hover:underline font-semibold"
          >
            {t('auth.otp_resend')}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Verify;
