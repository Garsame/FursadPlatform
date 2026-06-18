import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProviderAuth } from '../../context/ProviderAuthContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Briefcase } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useProviderAuth();
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
      navigate('/provider/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <Card className="w-full max-w-md p-8 border-brand-green/20">
        <div className="flex flex-col items-center mb-8 text-center">
          <Briefcase className="text-brand-green w-10 h-10 mb-3" />
          <span className="text-[10px] uppercase font-mono bg-brand-green/20 text-brand-green px-2 py-0.5 rounded border border-brand-green/30 tracking-wider">
            Job Provider Portal
          </span>
          <h2 className="text-2xl font-bold mt-3">{t('auth.signin_title')}</h2>
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
            placeholder="enter your corporate email"
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
            {loading ? 'Entering Portal...' : t('auth.signin_btn')}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-text-secondary">
          <span>Need to hire? </span>
          <Link to="/provider/signup" className="text-brand-green hover:underline font-semibold">
            Register Company
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
