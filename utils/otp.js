const crypto = require('crypto');
const { prisma } = require('../config/database');
const { logger } = require('./logger');

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_MINUTES = 2;

/**
 * Generate a random OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = OTP_LENGTH) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  
  return otp;
};

/**
 * Store OTP in database
 * @param {string} email - Email address
 * @param {string} otp - Generated OTP
 * @returns {Promise<Object>} - OTP record
 */
const storeOTP = async (email, otp) => {
  try {
    // Clean up expired OTPs for this email address
    await prisma.$executeRaw`
      DELETE FROM otp_verifications 
      WHERE email = ${email} AND expires_at < NOW()
    `;

    // Check if there's a recent OTP request (cooldown period)
    const recentOTP = await prisma.$queryRaw`
      SELECT created_at FROM otp_verifications 
      WHERE email = ${email} 
      AND created_at > DATE_SUB(NOW(), INTERVAL ${OTP_RESEND_COOLDOWN_MINUTES} MINUTE)
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (recentOTP.length > 0) {
      const timeSinceLastOTP = Date.now() - new Date(recentOTP[0].created_at).getTime();
      const cooldownRemaining = (OTP_RESEND_COOLDOWN_MINUTES * 60 * 1000) - timeSinceLastOTP;
      
      if (cooldownRemaining > 0) {
        throw new Error(`Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before requesting a new OTP`);
      }
    }

    // Create new OTP record using database timezone
    const otpRecord = await prisma.$executeRaw`
      INSERT INTO otp_verifications (email, otp_code, expires_at, is_verified, attempts, created_at)
      VALUES (${email}, ${otp}, DATE_ADD(NOW(), INTERVAL ${OTP_EXPIRY_MINUTES} MINUTE), false, 0, NOW())
    `;
    
    // Get the actual expires_at value from database
    const expiresAtResult = await prisma.$queryRaw`
      SELECT expires_at FROM otp_verifications 
      WHERE email = ${email} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const expiresAt = expiresAtResult[0]?.expires_at;

    logger.info('OTP stored successfully', { email, expiresAt });
    
    return {
      email,
      expiresAt,
      attemptsRemaining: MAX_OTP_ATTEMPTS
    };
  } catch (error) {
    logger.error('Failed to store OTP:', error.message);
    throw error;
  }
};

/**
 * Verify OTP
 * @param {string} email - Email address
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} - Verification result
 */
const verifyOTP = async (email, otp) => {
  try {
    // Find the latest OTP for this email address
    const otpRecords = await prisma.$queryRaw`
      SELECT id, otp_code, expires_at, is_verified, attempts, created_at
      FROM otp_verifications 
      WHERE email = ${email} 
      AND expires_at > NOW()
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (otpRecords.length === 0) {
      logger.warn('OTP verification failed - no valid OTP found', { email });
      return {
        success: false,
        message: 'No valid OTP found. Please request a new OTP.',
        code: 'OTP_NOT_FOUND'
      };
    }

    const otpRecord = otpRecords[0];

    // Check if OTP is already verified
    if (otpRecord.is_verified) {
      logger.warn('OTP verification failed - already verified', { email });
      return {
        success: false,
        message: 'OTP has already been used. Please request a new OTP.',
        code: 'OTP_ALREADY_USED'
      };
    }

    // Check if maximum attempts exceeded
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      logger.warn('OTP verification failed - max attempts exceeded', { email, attempts: otpRecord.attempts });
      return {
        success: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
        code: 'MAX_ATTEMPTS_EXCEEDED'
      };
    }

    // Increment attempt count
    await prisma.$executeRaw`
      UPDATE otp_verifications 
      SET attempts = attempts + 1 
      WHERE id = ${otpRecord.id}
    `;

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      const attemptsRemaining = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
      
      logger.warn('OTP verification failed - incorrect OTP', { 
        email, 
        attempts: otpRecord.attempts + 1,
        attemptsRemaining 
      });
      
      return {
        success: false,
        message: `Incorrect OTP. ${attemptsRemaining} attempts remaining.`,
        code: 'INCORRECT_OTP',
        attemptsRemaining
      };
    }

    // Mark OTP as verified
    await prisma.$executeRaw`
      UPDATE otp_verifications 
      SET is_verified = true 
      WHERE id = ${otpRecord.id}
    `;

    logger.info('OTP verified successfully', { email });
    
    return {
      success: true,
      message: 'OTP verified successfully',
      code: 'OTP_VERIFIED'
    };
  } catch (error) {
    logger.error('OTP verification error:', error.message);
    return {
      success: false,
      message: 'OTP verification failed. Please try again.',
      code: 'VERIFICATION_ERROR'
    };
  }
};

/**
 * Send OTP via Email
 * @param {string} email - Email address
 * @param {string} otp - OTP code
 * @param {string} name - User name (optional)
 * @returns {Promise<Object>} - Send result
 */
const sendOTPEmail = async (email, otp, name = 'User') => {
  try {
    const { sendEmail } = require('./email');
    
    const subject = 'Your Verification Code - Pest Control Management';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { background: #1e40af; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for signing up with Pest Control Management. To complete your registration, please use the verification code below:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p><strong>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong></p>
            
            <div class="warning">
              <strong>Security Notice:</strong>
              <ul>
                <li>Never share this code with anyone</li>
                <li>Our team will never ask for this code</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you're having trouble with verification, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 Pest Control Management System. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      Hello ${name}!
      
      Thank you for signing up with Pest Control Management.
      
      Your verification code is: ${otp}
      
      This code will expire in ${OTP_EXPIRY_MINUTES} minutes.
      
      Security Notice:
      - Never share this code with anyone
      - Our team will never ask for this code
      - If you didn't request this code, please ignore this email
      
      If you're having trouble with verification, please contact our support team.
      
      © 2024 Pest Control Management System
    `;
    
    const result = await sendEmail({
      to: email,
      subject,
      text,
      html
    });
    
    logger.info('OTP email sent successfully', { email, messageId: result.messageId });
    
    return {
      success: true,
      message: 'OTP sent successfully to your email',
      messageId: result.messageId
    };
  } catch (error) {
    logger.error('Failed to send OTP email:', { email, error: error.message });
    throw new Error('Failed to send verification email. Please try again.');
  }
};

/**
 * Send OTP via SMS (Mock implementation)
 * @param {string} mobile - Mobile number
 * @param {string} otp - OTP to send
 * @returns {Promise<Object>} - Send result
 */
const sendOTPSMS = async (mobile, otp) => {
  try {
    // Mock SMS API call
    // In production, integrate with actual SMS service like Twilio, AWS SNS, etc.
    
    const smsData = {
      to: mobile,
      message: `Your Pest Control Management verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
      sender: 'PESTCTRL'
    };

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful response
    const mockResponse = {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      cost: 0.05 // Mock cost in currency units
    };

    logger.info('OTP SMS sent successfully (MOCK)', { 
      mobile, 
      messageId: mockResponse.messageId,
      cost: mockResponse.cost 
    });

    // In development, log the OTP for testing
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`🔐 OTP for ${mobile}: ${otp}`);
    }

    return mockResponse;
  } catch (error) {
    logger.error('Failed to send OTP SMS:', error.message);
    throw new Error('Failed to send OTP. Please try again.');
  }
};

/**
 * Clean up expired OTPs (should be run periodically)
 * @returns {Promise<number>} - Number of cleaned up records
 */
const cleanupExpiredOTPs = async () => {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM otp_verifications 
      WHERE expires_at < NOW()
    `;

    logger.info(`Cleaned up ${result} expired OTP records`);
    return result;
  } catch (error) {
    logger.error('Failed to cleanup expired OTPs:', error.message);
    return 0;
  }
};

/**
 * Get OTP statistics for monitoring
 * @param {string} mobile - Mobile number (optional)
 * @returns {Promise<Object>} - OTP statistics
 */
const getOTPStats = async (mobile = null) => {
  try {
    let stats;
    
    if (mobile) {
      // Stats for specific mobile number
      const mobileStats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as successful_verifications,
          SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_otps,
          AVG(attempts) as avg_attempts
        FROM otp_verifications 
        WHERE mobile = ${mobile}
      `;
      
      stats = mobileStats[0];
    } else {
      // Overall stats
      const overallStats = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(DISTINCT mobile) as unique_mobiles,
          SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as successful_verifications,
          SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_otps,
          AVG(attempts) as avg_attempts
        FROM otp_verifications
      `;
      
      stats = overallStats[0];
    }

    return {
      ...stats,
      success_rate: stats.total_requests > 0 
        ? ((stats.successful_verifications / stats.total_requests) * 100).toFixed(2) + '%'
        : '0%'
    };
  } catch (error) {
    logger.error('Failed to get OTP stats:', error.message);
    return null;
  }
};

/**
 * Format mobile number to standard format
 * @param {string} mobile - Mobile number
 * @returns {string} - Formatted mobile number
 */
const formatMobileNumber = (mobile) => {
  // Remove all non-digit characters
  const cleaned = mobile.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  
  return mobile; // Return as-is if format is unclear
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  sendOTPEmail,
  sendOTPSMS,
  cleanupExpiredOTPs,
  getOTPStats,
  formatMobileNumber,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  MAX_OTP_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MINUTES
};