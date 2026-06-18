import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ClipboardCopy, Brain, ArrowRight, ArrowLeft, Send, Sparkles, Building, MapPin } from 'lucide-react';

const PostJob = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form inputs
  const [title, setTitle] = useState('');
  const [employmentType, setEmploymentType] = useState('full-time');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Somalia');
  const [salaryMin, setSalaryMin] = useState(1000);
  const [salaryMax, setSalaryMax] = useState(2500);
  
  const [description, setDescription] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [educationLevel, setEducationLevel] = useState('Bachelor');
  const [experienceLevel, setExperienceLevel] = useState('mid');

  // AI Description Generator Inputs
  const [aiPrompts, setAiPrompts] = useState({
    responsibilities: '',
    keySkills: '',
    environment: 'Office',
    experience: '3 years in backend APIs'
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  // Submission Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerateAI = async () => {
    setAiError('');
    setAiGenerating(true);
    try {
      const res = await api.post('/jobs/generate-description', {
        answers: {
          title: title || 'Software Engineer',
          responsibilities: aiPrompts.responsibilities,
          keySkills: aiPrompts.keySkills,
          environment: aiPrompts.environment,
          experience: aiPrompts.experience
        }
      });

      if (res.data?.success) {
        const data = res.data.data;
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.skillsRequired) setSkillsStr(data.skillsRequired.join(', '));
      }
    } catch (err) {
      setAiError('Failed to generate description with AI. Using mock data.');
      // Mock generation fallback
      setDescription(`We are looking for a skilled professional to lead development of our systems. Key responsibilities include designing APIs, testing components, and scaling infrastructure.\n\nKey Skills:\n- ${aiPrompts.keySkills || 'Coding'}\n- Experience: ${aiPrompts.experience}`);
      if (aiPrompts.keySkills) setSkillsStr(aiPrompts.keySkills);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const skillsRequired = skillsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const res = await api.post('/jobs', {
        title,
        description,
        skillsRequired,
        location: { city, country },
        salaryRange: { min: Number(salaryMin), max: Number(salaryMax), currency: 'USD' },
        educationLevel,
        experienceLevel,
        employmentType,
        status: 'published' // Request immediate publication
      });

      if (res.data?.success) {
        setSuccess(res.data.message || 'Job listing created successfully!');
        setTimeout(() => {
          navigate('/provider/jobs');
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish job listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 flex flex-col gap-6">
      {/* Progress timeline headers */}
      <div className="flex items-center justify-between text-sm px-4">
        <span className={`font-semibold ${step >= 1 ? 'text-brand-green' : 'text-text-muted'}`}>1. Basic Info</span>
        <div className="h-0.5 flex-grow mx-4 bg-border-strong" />
        <span className={`font-semibold ${step >= 2 ? 'text-brand-green' : 'text-text-muted'}`}>2. Description & Skills</span>
        <div className="h-0.5 flex-grow mx-4 bg-border-strong" />
        <span className={`font-semibold ${step >= 3 ? 'text-brand-green' : 'text-text-muted'}`}>3. Review & Publish</span>
      </div>

      {error && <div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded-card text-sm font-semibold">{error}</div>}
      {success && <div className="bg-success/10 border border-success/30 text-success p-4 rounded-card text-sm font-semibold">{success}</div>}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="flex flex-col gap-6">
          <h3 className="text-base font-bold text-text-primary">Step 1: Basic Job Information</h3>

          <Input
            label="Job Title"
            placeholder="e.g. Senior Node.js Developer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City Location"
                placeholder="Mogadishu"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                label="Country Location"
                placeholder="Somalia"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              type="number"
              label="Minimum Salary ($/mo)"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Maximum Salary ($/mo)"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="primary" className="gap-2" onClick={() => setStep(2)} disabled={!title || !city || !country}>
              Continue to Step 2 <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Description & Skills */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          {/* AI Generator Helper Box */}
          <Card className="border-brand-green/30 bg-brand-green/5">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
              <Brain size={18} className="text-brand-green" />
              AI Description Draft Assistant
            </h4>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Generate a professional job description instantly using Gemini AI by completing these short details.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input
                label="Core responsibilities"
                placeholder="e.g. Build Rest APIs, design DB schema"
                value={aiPrompts.responsibilities}
                onChange={(e) => setAiPrompts({ ...aiPrompts, responsibilities: e.target.value })}
              />
              <Input
                label="Required key skills"
                placeholder="e.g. Node, React, Mongo"
                value={aiPrompts.keySkills}
                onChange={(e) => setAiPrompts({ ...aiPrompts, keySkills: e.target.value })}
              />
            </div>

            {aiError && <span className="text-xs text-danger block mb-2">{aiError}</span>}

            <Button variant="primary" onClick={handleGenerateAI} disabled={aiGenerating || !aiPrompts.responsibilities}>
              {aiGenerating ? 'Generating Description...' : 'Draft Description with AI'}
            </Button>
          </Card>

          {/* Core editor fields */}
          <Card className="flex flex-col gap-6">
            <h3 className="text-base font-bold text-text-primary">Step 2: Detailed Requirements</h3>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Job Description Text</label>
              <textarea
                placeholder="Enter job description or use AI draft assistant..."
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>

            <Input
              label="Keywords Skills Required (Comma separated)"
              placeholder="e.g. Node.js, Express, MongoDB, REST APIs"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">Minimum Education Level</label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
                >
                  <option value="high school">High School</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor</option>
                  <option value="master">Master</option>
                  <option value="phd">PhD</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">Minimum Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-4 h-input bg-bg-primary border border-border-subtle focus:border-brand-green focus:outline-none rounded-input text-sm text-text-primary"
                >
                  <option value="entry">Entry level</option>
                  <option value="mid">Mid level</option>
                  <option value="senior">Senior level</option>
                  <option value="lead">Lead level</option>
                  <option value="executive">Executive level</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
              <Button variant="secondary" className="gap-2" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </Button>
              <Button variant="primary" className="gap-2" onClick={() => setStep(3)} disabled={!description || !skillsStr}>
                Preview Details <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Review + Publish */}
      {step === 3 && (
        <Card className="flex flex-col gap-6">
          <h3 className="text-base font-bold text-text-primary">Step 3: Review & Publish Job</h3>

          {/* Job Card Preview */}
          <div className="bg-bg-elevated/50 p-6 rounded-card border border-border-subtle flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-bold text-brand-green">{title || 'Job Title'}</h4>
                <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                  <MapPin size={12} /> {city}, {country}
                </p>
              </div>
              <Badge variant="success" className="capitalize">{employmentType}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary border-y border-border-subtle py-3">
              <span>Salary: ${salaryMin} - ${salaryMax} USD</span>
              <span>Edu: <span className="capitalize">{educationLevel}</span></span>
              <span>Exp: <span className="capitalize">{experienceLevel}</span></span>
            </div>

            <div>
              <span className="text-xs font-bold text-text-primary block mb-1">Keywords Required:</span>
              <div className="flex flex-wrap gap-1">
                {skillsStr.split(',').map((s, i) => s.trim() && <Badge key={i}>{s.trim()}</Badge>)}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-text-primary block mb-1">Description:</span>
              <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed bg-bg-surface p-3 rounded border border-border-subtle font-mono max-h-[150px] overflow-y-auto">
                {description}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
            <Button variant="secondary" className="gap-2" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="primary" className="gap-2" onClick={handleSubmit} disabled={loading}>
              <Send size={16} /> {loading ? 'Publishing...' : 'Publish Job Listing'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PostJob;
