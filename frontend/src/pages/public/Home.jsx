import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, UserPlus, Brain, CheckCircle, Mail, MapPin, Phone } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [successMsg, setSuccessMsg] = useState('');

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSuccessMsg('Your message has been sent successfully. Thank you!');
    setContactForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="bg-bg-primary text-text-primary">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden py-24 flex items-center justify-center min-h-[75vh]">
        {/* Subtle mesh background gradient */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-green/10 via-bg-primary to-bg-primary" />
        
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-text-primary via-text-primary to-brand-green bg-clip-text text-transparent leading-tight">
            {t('home.hero_title')}
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            {t('home.hero_subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" className="gap-2 text-base w-full sm:w-auto" onClick={() => navigate('/signup')}>
              {t('home.cta_find')} <ArrowRight size={18} />
            </Button>
            <Link to="/provider/login" className="w-full sm:w-auto">
              <Button variant="secondary" className="text-base w-full sm:w-auto">
                {t('home.cta_post')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="bg-bg-surface border-y border-border-subtle py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-text-primary mb-4">{t('home.how_it_works')}</h2>
            <div className="h-1 w-12 bg-brand-green mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="flex flex-col items-center text-center p-8">
              <div className="p-4 bg-brand-green/10 text-brand-green rounded-full mb-6">
                <UserPlus size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('home.how_step_1_title')}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{t('home.how_step_1_desc')}</p>
            </Card>

            <Card className="flex flex-col items-center text-center p-8">
              <div className="p-4 bg-brand-green/10 text-brand-green rounded-full mb-6">
                <Brain size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('home.how_step_2_title')}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{t('home.how_step_2_desc')}</p>
            </Card>

            <Card className="flex flex-col items-center text-center p-8">
              <div className="p-4 bg-brand-green/10 text-brand-green rounded-full mb-6">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('home.how_step_3_title')}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{t('home.how_step_3_desc')}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. ABOUT SECTION (BRIEF) */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-text-primary mb-6">{t('home.about_title')}</h2>
            <p className="text-text-secondary leading-relaxed mb-8">{t('home.about_desc')}</p>
            <Button variant="secondary" onClick={() => navigate('/about')}>Learn More</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="text-center p-6 bg-bg-surface flex flex-col justify-center min-h-[140px]">
              <span className="text-2xl font-bold text-brand-green block mb-2">10,000+</span>
              <span className="text-xs text-text-secondary">{t('home.stats_users')}</span>
            </Card>
            <Card className="text-center p-6 bg-bg-surface flex flex-col justify-center min-h-[140px]">
              <span className="text-2xl font-bold text-brand-green block mb-2">500+</span>
              <span className="text-xs text-text-secondary">{t('home.stats_employers')}</span>
            </Card>
            <Card className="text-center p-6 bg-bg-surface flex flex-col justify-center min-h-[140px]">
              <span className="text-2xl font-bold text-brand-green block mb-2">East Africa</span>
              <span className="text-xs text-text-secondary">{t('home.stats_focus')}</span>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. CONTACT FORM & INFO */}
      <section className="bg-bg-surface border-t border-border-subtle py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info Details */}
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold text-text-primary mb-6">{t('home.contact_title')}</h2>
            <p className="text-text-secondary mb-8 leading-relaxed">{t('home.contact_desc')}</p>
            
            <div className="flex flex-col gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-brand-green" />
                <span>Hodan District, Mogadishu, Somalia</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-brand-green" />
                <span>+252 61 234567</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-brand-green" />
                <span>support@fursad.so</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card className="p-8">
            <form onSubmit={handleContactSubmit} className="flex flex-col gap-6">
              <Input
                label="Full Name"
                placeholder="Enter your name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
              <Input
                type="email"
                label="Email Address"
                placeholder="Enter your email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">Message</label>
                <textarea
                  placeholder="How can we help you?"
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-text-primary placeholder:text-text-muted transition-colors duration-200"
                />
              </div>
              
              {successMsg && <span className="text-sm text-success font-semibold">{successMsg}</span>}
              
              <Button type="submit" variant="primary">Send Message</Button>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
