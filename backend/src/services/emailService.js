/**
 * Email Verification Service
 * Handles generating and sending OTP codes via email (stub/console-logged in dev).
 */

const generateOTP = () => {
  // Generate 6-digit numeric string
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log('\n==================================================');
    console.log(`[MAIL STUB] TO: ${email}`);
    console.log('[MAIL STUB] SUBJECT: Verify Your Fursad Account');
    console.log('[MAIL STUB] BODY:');
    console.log(`  Ku soo dhawaada Fursad! Welcome to Fursad!`);
    console.log(`  Please enter the following 6-digit verification code to complete your registration:`);
    console.log(`  \n        >>> ${otp} <<<\n`);
    console.log(`  This code will expire in 10 minutes.`);
    console.log('==================================================\n');
    
    // Simulate async network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  } catch (error) {
    console.error('Failed to send verification email stub:', error.message);
    return false;
  }
};

const sendInterviewPrepEmail = async (email, candidateName, jobTitle, questions, tip) => {
  try {
    console.log('\n==================================================');
    console.log(`[MAIL STUB] TO: ${email}`);
    console.log(`[MAIL STUB] SUBJECT: Interview Preparation Guide - ${jobTitle}`);
    console.log('[MAIL STUB] BODY:');
    console.log(`  Hello ${candidateName},`);
    console.log(`  Congratulations on reaching the interview stage for the "${jobTitle}" position!`);
    console.log(`  Here are some questions to help you prepare:`);
    questions.forEach((q, idx) => {
      console.log(`    ${idx + 1}. ${q}`);
    });
    console.log(`\n  AI Preparation Tip:\n  ${tip}`);
    console.log('\n  Good luck!');
    console.log('==================================================\n');
    return true;
  } catch (error) {
    console.error('Failed to send interview prep email:', error.message);
    return false;
  }
};

const sendStatusUpdateEmail = async (email, candidateName, jobTitle, status, customMessage) => {
  try {
    console.log('\n==================================================');
    console.log(`[MAIL STUB] TO: ${email}`);
    console.log(`[MAIL STUB] SUBJECT: Application Update - ${jobTitle}`);
    console.log('[MAIL STUB] BODY:');
    console.log(`  Hello ${candidateName},`);
    console.log(`  Your application for "${jobTitle}" has been updated to: ${status.toUpperCase()}.`);
    console.log(`  Message:\n  ${customMessage}`);
    console.log('\n  Thank you,');
    console.log('  The Fursad Team');
    console.log('==================================================\n');
    return true;
  } catch (error) {
    console.error('Failed to send status update email:', error.message);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendInterviewPrepEmail,
  sendStatusUpdateEmail
};
