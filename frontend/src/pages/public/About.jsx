import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Heart, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-bg-primary text-text-primary py-20 px-6 max-w-5xl mx-auto flex flex-col gap-16">
      {/* Hero header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Our Mission & Values</h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Fursad is dedicated to building sustainable workforce infrastructures across East Africa using artificial intelligence.
        </p>
      </div>

      {/* Grid boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="flex flex-col gap-4">
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full w-fit">
            <Target size={24} />
          </div>
          <h3 className="text-lg font-bold">Our Mission</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            To provide clean, fair, and accessible employment channels for job seekers while optimizing hiring processes for regional businesses.
          </p>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full w-fit">
            <Eye size={24} />
          </div>
          <h3 className="text-lg font-bold">Our Vision</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            To construct a robust digital employment corridor bridging skills deficiencies and establishing Somali talent globally.
          </p>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-full w-fit">
            <Heart size={24} />
          </div>
          <h3 className="text-lg font-bold">Core Values</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Integrity, fair wages, algorithmic transparency, and a relentless focus on supporting opportunity across East Africa.
          </p>
        </Card>
      </div>

      {/* Paragraph detailed */}
      <Card className="p-8 leading-relaxed text-text-secondary">
        <h3 className="text-xl font-bold text-text-primary mb-4">Empowering Somalia's Digital Workforce</h3>
        <p className="mb-4">
          Somalia has a highly dynamic youth population. However, search visibility gap and manual CV screen inefficiencies frequently slow down growth.
        </p>
        <p>
          Fursad answers these problems by introducing two-way machine learning matching. Candidates see jobs matching their current experience, and recruiters review applicants ordered by qualification similarity.
        </p>
      </Card>
    </div>
  );
};

export default About;
