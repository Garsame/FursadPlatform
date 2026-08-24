import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Mail, Phone, MapPin, GraduationCap, Briefcase, Lock, AlertCircle, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { useJobseekerAuth } from '../../context/JobseekerAuthContext';
import api from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Logo from '../../components/Logo';

const SIDE_IMG =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80';

const EDUCATION = ['High School', 'Diploma', 'Bachelor', 'Master', 'PhD'];
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    name: '', email: '', phone: '', gender: '',
    country: 'Somalia', city: '', educationLevel: '', jobSpecification: '',
    password: '', confirmPassword: '',
  });

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const stepOneValid =
    f.name.trim() && f.email.trim() && f.phone.trim() && f.country.trim() && f.city.trim();

  const goNext = (e) => {
    e.preventDefault();
    setError('');
    if (!stepOneValid) return setError('Please fill in all required fields.');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (f.password.length < 8) return setError('Password must be at least 8 characters.');
    if (f.password !== f.confirmPassword) return setError('The two passwords do not match.');

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        password: f.password,
        role: 'jobseeker',
        gender: f.gender,
        country: f.country.trim(),
        city: f.city.trim(),
        educationLevel: f.educationLevel,
        jobSpecification: f.jobSpecification.trim(),
      });

      if (res.data?.success) {
        navigate(`/verify?email=${encodeURIComponent(f.email.trim())}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-72px)]">
      <div className="flex items-center justify-center px-6 py-2xl">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {[1, 2].map((n) => (
              <React.Fragment key={n}>
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${
                  step >= n ? 'bg-brand-green text-brand-ink' : 'bg-bg-elevated text-text-muted'
                }`}>{n}</span>
                {n === 1 && <span className={`h-0.5 flex-1 rounded-full ${step > 1 ? 'bg-brand-green' : 'bg-bg-elevated'}`} />}
              </React.Fragment>
            ))}
            <span className="text-xs font-medium text-text-muted ml-1">
              {step === 1 ? 'About you' : 'Your account'}
            </span>
          </div>

          <h1 className="font-display text-4xl font-semibold text-text-primary">
            {t('auth.signup_title')}
          </h1>
          <p className="text-text-secondary mt-2">
            {step === 1
              ? 'Tell us who you are — this powers your job matches.'
              : 'Choose a password to secure your account.'}
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/25 rounded-input p-3 mt-6">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={goNext} className="flex flex-col gap-4 mt-7">
              <Input name="name" icon={User} label={t('auth.name')} placeholder="Ilyas Abdi"
                value={f.name} onChange={set('name')} required />

              <Input type="email" name="email" icon={Mail} label={t('auth.email')}
                placeholder={t('auth.email_ph')} value={f.email} onChange={set('email')} required />

              <div className="grid grid-cols-2 gap-4">
                <Input type="tel" name="phone" icon={Phone} label={t('auth.phone')}
                  placeholder="+252 61 234567" value={f.phone} onChange={set('phone')} required />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="gender" className="text-sm font-semibold text-text-primary">Gender</label>
                  <select id="gender" value={f.gender} onChange={set('gender')}
                    className="w-full h-input px-4 bg-bg-surface border border-border-subtle rounded-input
                      text-text-primary focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/18">
                    <option value="">Select…</option>
                    {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input name="country" icon={MapPin} label="Country" placeholder="Somalia"
                  value={f.country} onChange={set('country')} required />
                <Input name="city" icon={MapPin} label="City" placeholder="Mogadishu"
                  value={f.city} onChange={set('city')} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="educationLevel" className="text-sm font-semibold text-text-primary">
                  Highest education level
                </label>
                <select id="educationLevel" value={f.educationLevel} onChange={set('educationLevel')}
                  className="w-full h-input px-4 bg-bg-surface border border-border-subtle rounded-input
                    text-text-primary focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/18">
                  <option value="">Select…</option>
                  {EDUCATION.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <Input name="jobSpecification" icon={Briefcase} label="What do you do?"
                placeholder="e.g. Frontend Developer" value={f.jobSpecification}
                onChange={set('jobSpecification')}
                hint="Your own words. Our AI refines this into a full specification later." />

              <Button type="submit" variant="primary" size="lg" fullWidth className="mt-2">
                Continue <ArrowRight size={17} />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-7">
              <Input type="password" name="password" icon={Lock} label={t('auth.password')}
                placeholder="At least 8 characters" value={f.password} onChange={set('password')}
                required hint="Use 8 or more characters." />

              <Input type="password" name="confirmPassword" icon={Lock} label={t('auth.confirm_password')}
                placeholder="Type it again" value={f.confirmPassword} onChange={set('confirmPassword')}
                required
                error={f.confirmPassword && f.password !== f.confirmPassword ? 'Passwords do not match' : ''} />

              <div className="flex gap-3 mt-2">
                <Button variant="secondary" size="lg" onClick={() => { setStep(1); setError(''); }}>
                  <ArrowLeft size={17} />
                </Button>
                <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                  {loading ? 'Creating account…' : t('auth.signup_btn')}
                </Button>
              </div>

              <p className="text-xs text-text-muted text-center mt-1">
                You can add a profile photo right after verifying your email.
              </p>
            </form>
          )}

          <p className="text-center mt-8 text-sm text-text-secondary">
            {t('auth.has_account')}{' '}
            <Link to="/signin" className="font-semibold text-brand-deep hover:underline">
              {t('auth.signin_btn')}
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block bg-bg-deep overflow-hidden">
        <img src={SIDE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" />
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

export default SignUp;
