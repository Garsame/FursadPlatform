import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useJobseekerAuth } from '../../context/JobseekerAuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Logo from '../../components/Logo';

const SIDE_IMG =
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80';

const SignIn = () => {
  const { t } = useTranslation();
  const { login } = useJobseekerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Set when a visitor was bounced here from a job page so we can return them.
  const redirect = params.get('redirect') || '/dashboard';

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate(redirect);
    } else if (result.requiresVerification) {
      navigate(`/verify?email=${encodeURIComponent(formData.email)}`);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-72px)]">
      {/* ---------------------------------------------------- Form side */}
      <div className="flex items-center justify-center px-6 py-2xl">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>

          <h1 className="font-display text-4xl font-semibold text-text-primary">
            {t('auth.signin_title')}
          </h1>
          <p className="text-text-secondary mt-2">{t('auth.signin_sub')}</p>

          {redirect !== '/dashboard' && (
            <div className="flex items-start gap-2.5 bg-brand-muted border border-brand-green/30 rounded-input p-3 mt-6">
              <AlertCircle size={16} className="text-brand-deep shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">{t('auth.redirect_notice')}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/25 rounded-input p-3 mt-6">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-8">
            <Input
              type="email"
              name="email"
              icon={Mail}
              label={t('auth.email')}
              placeholder={t('auth.email_ph')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              type="password"
              name="password"
              icon={Lock}
              label={t('auth.password')}
              placeholder={t('auth.password_ph')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <div className="-mt-2 text-right">
              <Link
                to={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
                className="text-sm font-semibold text-brand-deep hover:underline"
              >
                {t('auth.forgot_link')}
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? t('auth.signing_in') : t('auth.signin_btn')}
            </Button>
          </form>

          <p className="text-center mt-8 text-sm text-text-secondary">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="font-semibold text-brand-deep hover:underline">
              {t('auth.signup_btn')}
            </Link>
          </p>

          <p className="text-center mt-4 text-xs text-text-muted">
            {t('auth.employer_prompt')}{' '}
            <Link to="/provider/login" className="font-semibold text-text-secondary hover:text-brand-deep">
              {t('auth.employer_link')}
            </Link>
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- Image side */}
      <div className="relative hidden lg:block bg-bg-deep overflow-hidden">
        <img
          src={SIDE_IMG}
          alt="Colleagues collaborating in an office"
          className="absolute inset-0 w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-deeper via-brand-deep/85 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <Logo variant="inverse" />
          <blockquote className="font-display text-3xl font-semibold text-text-inverse leading-snug mt-8 max-w-md">
            {t('auth.quote')}
          </blockquote>
          <p className="text-sm text-text-onDeepDim mt-4">{t('auth.quote_sub')}</p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
