const assert = require('assert');
const { calculateMatchScore } = require('./src/services/matchingService');
const { generateOTP } = require('./src/services/emailService');
const aiService = require('./src/services/aiService');

console.log('--- RUNNING PLATFORM VERIFICATION TESTS ---');

// 1. Verify OTP generation
console.log('\n[TEST 1] Verifying OTP Generation...');
const code = generateOTP();
assert.strictEqual(code.length, 6);
assert.strictEqual(typeof code, 'string');
assert.ok(!isNaN(Number(code)));
console.log('✔ OTP generated successfully:', code);

// 2. Verify Matching Algorithm
console.log('\n[TEST 2] Verifying Matching Algorithm Formula...');
const mockProfile = {
  skills: ['JavaScript', 'React', 'Node.js', 'CSS'],
  location: { city: 'Mogadishu', country: 'Somalia' },
  salaryExpectation: { min: 800, max: 1500 },
  highestEducationLevel: 'Bachelor',
  experienceLevel: 'mid'
};

const mockJob = {
  skillsRequired: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
  location: { city: 'Mogadishu', country: 'Somalia' },
  salaryRange: { min: 1000, max: 2000 },
  educationLevel: 'Bachelor',
  experienceLevel: 'mid'
};

const match = calculateMatchScore(mockProfile, mockJob);
console.log('Score computed:', match.score);
console.log('Breakdown details:', match.breakdown);

// Skills match: 3 / 5 = 60%. Weighted = 60 * 0.45 = 27
// Location match: city/country matches = 100%. Weighted = 100 * 0.2 = 20
// Salary: overlap (800-1500 overlaps with 1000-2000) = 100%. Weighted = 100 * 0.15 = 15
// Education: Bachelor matches Bachelor = 100%. Weighted = 100 * 0.1 = 10
// Experience: mid matches mid = 100%. Weighted = 100 * 0.1 = 10
// Total = 27 + 20 + 15 + 10 + 10 = 82
assert.strictEqual(match.score, 82);
assert.strictEqual(match.breakdown.skills, 60);
assert.strictEqual(match.breakdown.location, 100);
assert.strictEqual(match.breakdown.salary, 100);
assert.strictEqual(match.breakdown.education, 100);
assert.strictEqual(match.breakdown.experience, 100);
console.log('✔ Matching service weights verify correctly.');

// 3. Verify AI Mock Responses
console.log('\n[TEST 3] Verifying AI Service Fallbacks...');
(async () => {
  const parsed = await aiService.parseResume('Test resume content');
  assert.ok(parsed.skills.length > 0);
  assert.strictEqual(parsed.experienceLevel, 'mid');
  
  const reviewed = await aiService.reviewJobPost({ title: 'Software Engineer', description: 'Help write javascript backend' });
  assert.ok(reviewed.qualityScore >= 0);
  
  const questions = await aiService.generateInterviewQuestions({ title: 'DevOps' });
  assert.ok(questions.questions.length > 0);

  console.log('✔ AI Service fallback degradation tests passed.');
  console.log('\nALL TESTS PASSED SUCCESSFULLY! Ready for backend setup.');
})();
