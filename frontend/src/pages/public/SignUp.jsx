import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useJobseekerAuth } from '../../context/JobseekerAuthContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Briefcase } from 'lucide-react';

const SignUp = () => {
  const { t } = useTranslation();
  const { register } = useJobseekerAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    const result = await register(
      formData.name,
      formData.email,
      formData.phone,
      formData.password
    );

    if (result.success) {
      // Redirect to OTP verification with email query parameter
      navigate(`/verify?email=${encodeURIComponent(formData.email)}`);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-bg-primary py-12 px-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <Briefcase className="text-brand-green w-10 h-10 mb-3" />
          <h2 className="text-2xl font-bold">{t('auth.signup_title')}</h2>
          <p className="text-sm text-text-secondary mt-1">Register as a Job Seeker</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-btn p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t('auth.name')}
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <Input
            type="email"
            label={t('auth.email')}
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label={t('auth.phone')}
            placeholder="+252 61 XXXXXXX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          
          <Input
            type="password"
            label={t('auth.password')}
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Input
            type="password"
            label={t('auth.confirm_password')}
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />

          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Creating Account...' : t('auth.signup_btn')}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-text-secondary">
          <span>{t('auth.has_account')} </span>
          <Link to="/signin" className="text-brand-green hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignUp;
