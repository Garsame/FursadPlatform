import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { User, GraduationCap, Briefcase, Plus, Trash2, Brain, AlertCircle } from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // AI Resume Parse Paste Box
  const [resumeText, setResumeText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Form states
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(0);
  const [experienceLevel, setExperienceLevel] = useState('entry');
  const [highestEducationLevel, setHighestEducationLevel] = useState('');

  // Lists states
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/profile/me');
        if (res.data?.success) {
          const data = res.data.data;
          setProfile(data);
          
          // Populate forms
          setHeadline(data.headline || '');
          setBio(data.bio || '');
          setSkillsStr((data.skills || []).join(', '));
          setCity(data.location?.city || '');
          setCountry(data.location?.country || '');
          setSalaryMin(data.salaryExpectation?.min || 0);
          setSalaryMax(data.salaryExpectation?.max || 0);
          setExperienceLevel(data.experienceLevel || 'entry');
          setHighestEducationLevel(data.highestEducationLevel || '');
          setEducation(data.education || []);
          setExperience(data.experience || []);
        }
      } catch (err) {
        console.error('Failed to load profile:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleAddEducation = () => {
    setEducation([
      ...education,
      { institution: '', level: 'Bachelor', fieldOfStudy: '', startYear: 2020, endYear: 2024 }
    ]);
  };

  const handleRemoveEducation = (index) => {
    setEducation(education.filter((_, idx) => idx !== index));
  };

  const handleEducationChange = (index, field, val) => {
    const updated = education.map((edu, idx) => {
      if (idx === index) {
        return { ...edu, [field]: val };
      }
      return edu;
    });
    setEducation(updated);
  };

  const handleAddExperience = () => {
    setExperience([
      ...experience,
      { title: '', company: '', startDate: '', endDate: '', description: '' }
    ]);
  };

  const handleRemoveExperience = (index) => {
    setExperience(experience.filter((_, idx) => idx !== index));
  };

  const handleExperienceChange = (index, field, val) => {
    const updated = experience.map((exp, idx) => {
      if (idx === index) {
        return { ...exp, [field]: val };
      }
      return exp;
    });
    setExperience(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    // Parse skills tags
    const skills = skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await api.put('/profile/me', {
        headline,
        bio,
        skills,
        location: { city, country },
        salaryExpectation: { min: Number(salaryMin), max: Number(salaryMax), currency: 'USD' },
        experienceLevel,
        highestEducationLevel,
        education,
        experience
      });

      if (res.data?.success) {
        setProfile(res.data.data);
        setMessage('Profile updated successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAIParse = async () => {
    if (!resumeText.trim()) return;
    setParsing(true);
    setMessage('');
    setError('');

    try {
      const res = await api.post('/profile/parse-resume', { rawText: resumeText });
      
      if (res.data?.success) {
        const data = res.data.data;
        setProfile(data);
        
        // Repopulate inputs from AI response
        setHeadline(data.headline || '');
        setBio(data.bio || '');
        setSkillsStr((data.skills || []).join(', '));
        setCity(data.location?.city || '');
        setCountry(data.location?.country || '');
        setExperienceLevel(data.experienceLevel || 'entry');
        setHighestEducationLevel(data.highestEducationLevel || '');
        setEducation(data.education || []);
        
        // Format experience dates safely
        const formattedExp = (data.experience || []).map((exp) => ({
          ...exp,
          startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
          endDate: exp.endDate ? exp.endDate.slice(0, 10) : ''
        }));
        setExperience(formattedExp);
        
        setResumeText('');
        setMessage('AI parsed resume successfully and populated forms!');
      }
    } catch (err) {
      setError('AI parsing failed. Running fallbacks.');
    } finally {
      setParsing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00C27C]"></div>
      </div>
    );
  }

  const completeness = profile?.profileCompletenessScore || 0;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-12">
      {/* Messages */}
      {message && <div className="bg-success/10 border border-success/30 text-success p-4 rounded-card text-sm font-semibold">{message}</div>}
      {error && <div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded-card text-sm font-semibold">{error}</div>}

      {/* Completeness Bar */}
      <Card className="flex flex-col gap-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-text-primary">Profile Completeness Profile</span>
          <span className="font-extrabold text-brand-green">{completeness}%</span>
        </div>
        <div className="w-full bg-bg-elevated h-3 rounded-full overflow-hidden border border-border-subtle">
          <div 
            className="bg-brand-green h-full rounded-full transition-all duration-500" 
            style={{ width: `${completeness}%` }}
          />
        </div>
      </Card>

      {/* AI RESUME PARSER */}
      <Card className="border-brand-green/30 bg-brand-green/5">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2 mb-3">
          <Brain size={18} className="text-brand-green" />
          AI Resume Quick-Parse
        </h3>
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Paste your raw CV text, biography, or LinkedIn summaries below. Our Gemini integration will automatically extract your headline, skills, work experiences, and academic achievements.
        </p>
        <textarea
          placeholder="Paste resume details here (e.g. John Doe, Full Stack Engineer. Skills: React, Node. Experience: Tech Inc 2021-2023...)"
          rows={4}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="w-full p-4 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-xs text-text-primary placeholder:text-text-muted transition-colors duration-200 font-mono mb-4"
        />
        {profile?.aiImprovementTips && (
          <div className="flex items-start gap-2 bg-brand-green/10 border border-brand-green/30 text-brand-green p-3 rounded-card text-xs mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span><strong>AI Tips:</strong> {profile.aiImprovementTips}</span>
          </div>
        )}
        <Button variant="primary" onClick={handleAIParse} disabled={parsing || !resumeText.trim()}>
          {parsing ? 'Parsing CV Details...' : 'Parse Resume with AI'}
        </Button>
      </Card>

      {/* EDIT FORM */}
      <form onSubmit={handleSave} className="flex flex-col gap-8">
        {/* Section 1: Basic Info */}
        <Card className="flex flex-col gap-5">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 pb-2 border-b border-border-subtle">
            <User size={18} className="text-brand-green" />
            Basic Profile Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Professional Headline"
              placeholder="e.g. Senior Backend Engineer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-4 h-input bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead Developer</option>
                <option value="executive">Executive Management</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Short Biography</label>
            <textarea
              placeholder="Tell employers about your path, passion, and goals..."
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>

          <Input
            label="Technical Skills (Comma separated)"
            placeholder="e.g. React, Node.js, Express, MongoDB, Docker, Git"
            value={skillsStr}
            onChange={(e) => setSkillsStr(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="City Location"
              placeholder="e.g. Mogadishu"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Country Location"
              placeholder="e.g. Somalia"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Input
              type="number"
              label="Min Salary Expectation ($/mo)"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
            />
            <Input
              type="number"
              label="Max Salary Expectation ($/mo)"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
            />
            <Input
              label="Highest Education Completed"
              placeholder="e.g. Bachelor of Computer Science"
              value={highestEducationLevel}
              onChange={(e) => setHighestEducationLevel(e.target.value)}
            />
          </div>
        </Card>

        {/* Section 2: Education list */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <GraduationCap size={18} className="text-brand-green" />
              Education History
            </h3>
            <Button variant="secondary" className="h-8 text-xs px-3" onClick={handleAddEducation}>
              <Plus size={14} className="mr-1" /> Add Entry
            </Button>
          </div>

          {education.length === 0 ? (
            <p className="text-xs text-text-secondary py-3">No education entries added yet.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {education.map((edu, idx) => (
                <div key={idx} className="flex flex-col gap-4 border border-border-subtle p-4 rounded-card relative bg-bg-elevated/20">
                  <button
                    type="button"
                    onClick={() => handleRemoveEducation(idx)}
                    className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Institution Name"
                      value={edu.institution}
                      onChange={(e) => handleEducationChange(idx, 'institution', e.target.value)}
                      required
                    />
                    <Input
                      label="Field of Study"
                      value={edu.fieldOfStudy}
                      placeholder="e.g. Computer Science"
                      onChange={(e) => handleEducationChange(idx, 'fieldOfStudy', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Degree Level"
                      placeholder="e.g. Bachelor"
                      value={edu.level}
                      onChange={(e) => handleEducationChange(idx, 'level', e.target.value)}
                    />
                    <Input
                      type="number"
                      label="Start Year"
                      value={edu.startYear}
                      onChange={(e) => handleEducationChange(idx, 'startYear', Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      label="End Year"
                      value={edu.endYear}
                      onChange={(e) => handleEducationChange(idx, 'endYear', Number(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section 3: Experience list */}
        <Card className="flex flex-col gap-5">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Briefcase size={18} className="text-brand-green" />
              Work Experience History
            </h3>
            <Button variant="secondary" className="h-8 text-xs px-3" onClick={handleAddExperience}>
              <Plus size={14} className="mr-1" /> Add Entry
            </Button>
          </div>

          {experience.length === 0 ? (
            <p className="text-xs text-text-secondary py-3">No work experience entries added yet.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {experience.map((exp, idx) => (
                <div key={idx} className="flex flex-col gap-4 border border-border-subtle p-4 rounded-card relative bg-bg-elevated/20">
                  <button
                    type="button"
                    onClick={() => handleRemoveExperience(idx)}
                    className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Job Title"
                      value={exp.title}
                      onChange={(e) => handleExperienceChange(idx, 'title', e.target.value)}
                      required
                    />
                    <Input
                      label="Company Name"
                      value={exp.company}
                      onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Start Date"
                      value={exp.startDate ? exp.startDate.slice(0, 10) : ''}
                      onChange={(e) => handleExperienceChange(idx, 'startDate', e.target.value)}
                    />
                    <Input
                      type="date"
                      label="End Date"
                      value={exp.endDate ? exp.endDate.slice(0, 10) : ''}
                      placeholder="Leave blank if present"
                      onChange={(e) => handleExperienceChange(idx, 'endDate', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-secondary">Responsibilities Summary</label>
                    <textarea
                      placeholder="List key tasks, stack used, and achievements..."
                      rows={3}
                      value={exp.description}
                      onChange={(e) => handleExperienceChange(idx, 'description', e.target.value)}
                      className="w-full px-4 py-3 bg-bg-surface border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary placeholder:text-text-muted"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Save button */}
        <div className="flex items-center justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving Profile Details...' : 'Save Profile Details'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
