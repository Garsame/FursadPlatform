const assert = require('assert');
const { calculateMatchScore } = require('./src/services/matchingService');
const { generateOTP } = require('./src/services/emailService');
const aiService = require('./src/services/aiService');

/**
 * Everything here runs inside one async sequence.
 *
 * calculateMatchScore became async when semantic skill matching landed, but
 * this file still called it synchronously — so `match.score` read undefined off
 * a pending promise and the suite crashed on its first assertion. It has to be
 * awaited, and each test has to finish before the next one prints.
 */
(async () => {
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

  const match = await calculateMatchScore(mockProfile, mockJob);
  console.log('Score computed:', match.score);
  console.log('Breakdown details:', match.breakdown);

  // Location, salary, education and experience are pure arithmetic and are
  // asserted exactly. Skills are not: with a Gemini key present the 45% factor
  // is scored semantically, so "MongoDB" and "Express" can earn partial credit
  // against this profile and the total legitimately lands above the literal
  // 3-of-5. Pinning it to 82 would fail on a correctly configured server.
  assert.strictEqual(match.breakdown.location, 100);
  assert.strictEqual(match.breakdown.salary, 100);
  assert.strictEqual(match.breakdown.education, 100);
  assert.strictEqual(match.breakdown.experience, 100);

  // Literal matching gives exactly 3/5. Semantic may credit more, never less.
  assert.ok(
    match.breakdown.skills >= 60,
    `skills scored ${match.breakdown.skills}, expected at least the literal 60`
  );

  const expectedTotal = Math.round(
    match.breakdown.skills * 0.45 + 100 * 0.20 + 100 * 0.15 + 100 * 0.10 + 100 * 0.10
  );
  assert.strictEqual(match.score, expectedTotal);
  assert.ok(match.score >= 82, `total ${match.score} fell below the literal-matching floor of 82`);
  console.log(`✔ Matching service weights verify correctly (score ${match.score}, skills ${match.breakdown.skills}).`);

  // 3. Verify AI Mock Responses
  console.log('\n[TEST 3] Verifying AI Service Fallbacks...');
  const parsed = await aiService.parseResume('Test resume content');
  assert.ok(parsed.skills.length > 0);
  assert.strictEqual(parsed.experienceLevel, 'mid');

  const reviewed = await aiService.reviewJobPost({ title: 'Software Engineer', description: 'Help write javascript backend' });
  assert.ok(reviewed.qualityScore >= 0);

  const questions = await aiService.generateInterviewQuestions({ title: 'DevOps' });
  assert.ok(questions.questions.length > 0);

  console.log('✔ AI Service fallback degradation tests passed.');
  console.log('\nALL TESTS PASSED SUCCESSFULLY! Ready for backend setup.');
})().catch((err) => {
  console.error('\n✖ TEST FAILURE:', err.message);
  process.exit(1);
});
