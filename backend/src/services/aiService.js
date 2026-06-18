const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper to initialize Gemini API safely
let model = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Gemini AI Engine Initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Gemini AI Engine:', error.message);
  }
} else {
  console.log('Gemini API key missing. AI service running in Mock Mode.');
}

/**
 * 1. Parse Resume
 * Extracts profile fields from CV text or questionnaire answers.
 */
const parseResume = async (rawText, language = 'en') => {
  const defaultFallback = {
    headline: 'Software Engineer',
    bio: 'Experienced engineering professional focused on web technologies and high-performance APIs.',
    skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
    location: { city: 'Mogadishu', country: 'Somalia' },
    education: [
      {
        institution: 'Somali National University',
        level: 'Bachelor',
        fieldOfStudy: 'Computer Science',
        startYear: 2019,
        endYear: 2023
      }
    ],
    experience: [
      {
        title: 'Full Stack Developer',
        company: 'East Africa Tech Solutions',
        startDate: new Date('2023-08-01'),
        endDate: null,
        description: 'Developing core features for the business portal and client management system.'
      }
    ],
    experienceLevel: 'mid',
    highestEducationLevel: 'Bachelor',
    profileCompletenessScore: 85,
    aiImprovementTips: 'Consider adding details about certifications or side projects.'
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      You are an AI resume parser. Extract professional profile data from the raw text provided below.
      Respond ONLY with a valid JSON object matching this structure:
      {
        "headline": "Brief professional headline",
        "bio": "Professional summary paragraph",
        "skills": ["Skill1", "Skill2"],
        "location": { "city": "City name", "country": "Country name" },
        "education": [{ "institution": "Name", "level": "Bachelor/Master/etc", "fieldOfStudy": "Major", "startYear": 2019, "endYear": 2023 }],
        "experience": [{ "title": "Job title", "company": "Company Name", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD or null for present", "description": "Responsibilities" }],
        "experienceLevel": "entry or mid or senior or lead or executive",
        "highestEducationLevel": "Highest level completed",
        "profileCompletenessScore": 85,
        "aiImprovementTips": "Suggestions to complete profile"
      }
      
      Raw CV Text:
      "${rawText}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('AI Parse Resume Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 2. Review Job Post
 * Reviews job before publish for quality and fraud signals.
 */
const reviewJobPost = async (jobData) => {
  const defaultFallback = {
    qualityScore: 90,
    flags: [],
    suggestions: ['Include specific salary expectations if possible to attract top candidates.'],
    requiresManualReview: false
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      You are an automated job quality auditor. Analyze the job posting details for fraud, spam, or low quality.
      Job Details:
      Title: ${jobData.title}
      Description: ${jobData.description}
      Skills Required: ${JSON.stringify(jobData.skillsRequired)}
      Location: ${JSON.stringify(jobData.location)}
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "qualityScore": 0-100 score,
        "flags": ["Flag description if fraud/spam detected"],
        "suggestions": ["Suggestions to improve layout/description"],
        "requiresManualReview": true/false (set true if quality score < 70 or flags found)
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('AI Review Job Post Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 3. Generate Job Description
 * Generates full job description from 5 employer answers.
 */
const generateJobDescription = async (answers, language = 'en') => {
  const defaultFallback = {
    title: answers.title || 'Senior Software Engineer',
    description: `We are looking for a skilled professional to join our team. Key duties include managing product development, collaborating with cross-functional partners, and implementing scalable features.\n\nRequirements:\n- Strong problem-solving abilities\n- Communication skills\n- Experience in the field.`,
    skillsRequired: answers.keySkills ? answers.keySkills.split(',').map(s => s.trim()) : ['Project Management', 'Communication']
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      You are a recruiter. Generate a professional job posting based on the following answers provided by the employer:
      1. What is the job title? ${answers.title}
      2. What is the core responsibility? ${answers.responsibilities}
      3. What are the key skills? ${answers.keySkills}
      4. What is the work environment? ${answers.environment || 'Hybrid/Office'}
      5. What experience or qualifications are required? ${answers.experience}
      
      Language requested: ${language}
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "title": "Formatted Job Title",
        "description": "Rich job description text (use markdown headings or lists for formatting)",
        "skillsRequired": ["extracted", "required", "skills"]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('AI Generate Job Description Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 4. Generate Candidate Summary
 * 2-4 sentence natural language summary of candidate for employer.
 */
const generateCandidateSummary = async (profile, job, matchResult) => {
  const defaultFallback = `${profile.user?.name || 'The candidate'} is a strong match for the ${job.title} position, showing an overall score of ${matchResult?.score || 80}%. They possess key skills in ${profile.skills?.slice(0, 3).join(', ')} and have relevant work experience in similar roles. They fit the location requirements and demonstrate solid credentials.`;

  if (!model) return defaultFallback;

  try {
    const prompt = `
      Write a short, professional 2-to-4 sentence summary of candidate suitability for the employer.
      Candidate profile skills: ${JSON.stringify(profile.skills)}
      Candidate bio: ${profile.bio}
      Job requirement: ${job.title} - ${job.description.slice(0, 200)}
      Match score results: ${JSON.stringify(matchResult)}
      
      Return ONLY a plain text string summary.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI Generate Candidate Summary Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 5. Generate Interview Questions
 * audience "employer": questions to ask candidate.
 * audience "candidate": questions to prepare for + tip.
 */
const generateInterviewQuestions = async (job, audience = 'candidate') => {
  const defaultFallback = {
    questions: [
      'Can you describe your experience implementing scalable backend architectures?',
      'How do you manage cross-functional communication when planning sprint priorities?',
      'Tell us about a time you had to resolve a performance bottleneck in production.'
    ],
    tip: 'Review the main technologies mentioned in the job description and prepare architectural design scenarios.'
  };

  if (!model) return defaultFallback;

  try {
    const prompt = `
      Generate interview questions based on the job posting below.
      Job Title: ${job.title}
      Description summary: ${job.description.slice(0, 300)}
      Audience: ${audience} (If "employer", generate questions to ask. If "candidate", generate questions to prepare for)
      
      Respond ONLY with a valid JSON object matching this structure:
      {
        "questions": ["Question 1", "Question 2", "Question 3"],
        "tip": "Short prep/evaluation tip string"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('AI Generate Interview Questions Error:', error.message);
    return defaultFallback;
  }
};

/**
 * 6. Generate Status Update Message
 * Short professional message to candidate about status change.
 */
const generateStatusUpdateMessage = async (status, jobTitle, language = 'en') => {
  let fallbackMessage = `Dear Applicant, the status of your application for ${jobTitle} has been updated to "${status}". We will keep you updated.`;
  if (status === 'shortlisted') {
    fallbackMessage = `Congratulations! You have been shortlisted for the ${jobTitle} position. The hiring team will reach out shortly.`;
  } else if (status === 'interview') {
    fallbackMessage = `We would like to invite you for an interview for the ${jobTitle} position. Please check your inbox for details.`;
  } else if (status === 'rejected') {
    fallbackMessage = `Thank you for your application for the ${jobTitle} role. Unfortunately, we are not moving forward with your application at this time.`;
  }

  if (!model) return fallbackMessage;

  try {
    const prompt = `
      Write a short, professional, 1-to-2 sentence message to a candidate informing them their application status for the job "${jobTitle}" has changed to "${status}".
      Language: ${language}
      Return ONLY a plain text string. No other characters.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI Generate Status Update Message Error:', error.message);
    return fallbackMessage;
  }
};

module.exports = {
  parseResume,
  reviewJobPost,
  generateJobDescription,
  generateCandidateSummary,
  generateInterviewQuestions,
  generateStatusUpdateMessage
};
