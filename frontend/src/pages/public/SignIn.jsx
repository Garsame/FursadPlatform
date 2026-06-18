import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useJobseekerAuth } from '../../context/JobseekerAuthContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Briefcase } from 'lucide-react';

const SignIn = () => {
  const { t } = useTranslation();
  const { login } = useJobseekerAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      if (result.requiresVerification) {
        navigate(`/verify?email=${encodeURIComponent(formData.email)}`);
      } else {
        setError(result.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-bg-primary px-6">
      <Card className="w-full max-w-md p-8">
        {/* Header logo & title */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Briefcase className="text-brand-green w-10 h-10 mb-3" />
          <h2 className="text-2xl font-bold">{t('auth.signin_title')}</h2>
          <p className="text-sm text-text-secondary mt-1">Sign in as Job Seeker</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-btn p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            type="email"
            label={t('auth.email')}
            placeholder="enter your email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          
          <Input
            type="password"
            label={t('auth.password')}
            placeholder="enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Signing In...' : t('auth.signin_btn')}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-text-secondary">
          <span>{t('auth.no_account')} </span>
          <Link to="/signup" className="text-brand-green hover:underline font-semibold">
            Sign Up
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignIn;
