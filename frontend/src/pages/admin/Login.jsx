import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAdminAuth();
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
      navigate('/admin/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <Card className="w-full max-w-md p-8 border-red-500/20">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-full mb-3">
            <ShieldAlert size={36} />
          </div>
          <span className="text-[10px] uppercase font-mono bg-red-500/20 text-red-500 border border-red-500/35 px-2.5 py-0.5 rounded tracking-wider">
            Admin Management Portal
          </span>
          <h2 className="text-2xl font-bold mt-4">{t('auth.signin_title')}</h2>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-btn p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            type="email"
            label="Administrator Email"
            placeholder="admin@fursad.so"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          
          <Input
            type="password"
            label={t('auth.password')}
            placeholder="enter password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Button type="submit" variant="danger" fullWidth disabled={loading}>
            {loading ? 'Securing Access...' : 'Authenticate'}
          </Button>
        </form>

        <div className="text-center mt-6 text-sm text-text-secondary">
          <span>New administrator? </span>
          <Link to="/admin/signup" className="text-red-500 hover:underline font-semibold">
            Register Admin Account
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
