import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

/**
 * Password recovery, in two steps on one screen.
 *
 * Step 1 always advances to step 2, whether or not the address is registered —
 * the server deliberately returns the same message either way, and stopping on
 * "no such user" here would hand that information back over the UI instead.
 *
 * On success the server returns a token, so the user lands signed in rather
 * than being asked for the password they have just finished setting.
 */
const ForgotPassword = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();

  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setNotice(t('auth.forgot_sent'));
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (password.length < 8) return setError(t('auth.reset_too_short'));
    if (password !== confirm) return setError(t('auth.reset_mismatch'));

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        password
      });

      if (res.data?.success) {
        const { token, role } = res.data;

        // Same token segregation the rest of the app relies on, so the user
        // lands in the portal that matches the account they just recovered.
        if (role === 'employer') {
          localStorage.setItem('fursad_provider_token', token);
          window.location.href = '/provider/dashboard';
        } else if (role === 'admin') {
          localStorage.setItem('fursad_admin_token', token);
          window.location.href = '/admin/dashboard';
        } else {
          localStorage.setItem('fursad_jobseeker_token', token);
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-bg-primary px-6 py-2xl">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-brand-green/10 text-brand-deep rounded-full mb-4">
            {step === 'request' ? <Mail size={32} /> : <KeyRound size={32} />}
          </div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            {step === 'request' ? t('auth.forgot_title') : t('auth.reset_title')}
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            {step === 'request' ? t('auth.forgot_sub') : t('auth.reset_sub')}
          </p>
          {step === 'reset' && (
            <p className="text-sm font-semibold text-text-primary mt-1 break-all">{email}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/25 rounded-input p-3 mb-6">
            <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2.5 bg-success/10 border border-success/25 rounded-input p-3 mb-6">
            <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
            <p className="text-sm text-success">{notice}</p>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="flex flex-col gap-5">
            <Input
              type="email"
              name="email"
              icon={Mail}
              label={t('auth.email')}
              placeholder={t('auth.email_ph')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              {loading ? t('auth.forgot_sending') : t('auth.forgot_btn')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-5">
            <Input
              name="code"
              label={t('auth.reset_code')}
              placeholder="XXXXXX"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              required
              className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-[0.5em]"
            />
            <Input
              type="password"
              name="password"
              icon={Lock}
              label={t('auth.reset_new_password')}
              placeholder={t('auth.password_ph')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={t('auth.reset_too_short')}
              required
            />
            <Input
              type="password"
              name="confirm"
              icon={Lock}
              label={t('auth.reset_confirm_password')}
              placeholder={t('auth.password_ph')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              {loading ? t('auth.reset_saving') : t('auth.reset_btn')}
            </Button>

            <button
              type="button"
              onClick={() => { setStep('request'); setError(''); setNotice(''); setCode(''); }}
              className="text-sm text-text-secondary hover:text-brand-deep font-medium"
            >
              {t('auth.reset_back')}
            </button>
          </form>
        )}

        <div className="text-center mt-8">
          <Link
            to="/signin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep hover:underline"
          >
            <ArrowLeft size={15} /> {t('auth.back_to_signin')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
