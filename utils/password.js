const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logger } = require('./logger');

// Password configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Password strength requirements
const PASSWORD_REQUIREMENTS = {
  minLength: MIN_PASSWORD_LENGTH,
  maxLength: MAX_PASSWORD_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false // Set to true for stricter requirements
};

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`);
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error('Password hashing failed:', error.message);
    throw new Error('Password hashing failed');
  }
};

/**
 * Verify a password against its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if password matches
 */
const verifyPassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      return false;
    }

    if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
      return false;
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    if (isMatch) {
      logger.debug('Password verification successful');
    } else {
      logger.debug('Password verification failed');
    }
    
    return isMatch;
  } catch (error) {
    logger.error('Password verification error:', error.message);
    return false;
  }
};

/**
 * Validate password strength
 * @param {string} password - Plain text password
 * @returns {Object} - Validation result with isValid and errors
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required']
    };
  }

  // Length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Character requirements
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Common password patterns to avoid
  const commonPatterns = [
    /^(password|123456|qwerty|admin|letmein)$/i,
    /^(\w)\1{2,}$/, // Repeated characters like 'aaa' or '111'
    /^(012|123|234|345|456|567|678|789|890)+$/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i // Sequential letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password is too common or predictable');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 * @param {string} password - Plain text password
 * @returns {Object} - Strength score and level
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  let feedback = [];

  if (!password) {
    return { score: 0, level: 'Very Weak', feedback: ['Password is required'] };
  }

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Bonus points for complexity
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) score += 1;
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 1;

  // Determine strength level
  let level;
  if (score <= 2) {
    level = 'Very Weak';
    feedback.push('Use a longer password with mixed characters');
  } else if (score <= 4) {
    level = 'Weak';
    feedback.push('Add more character variety');
  } else if (score <= 6) {
    level = 'Fair';
    feedback.push('Consider adding special characters');
  } else if (score <= 8) {
    level = 'Good';
    feedback.push('Strong password!');
  } else {
    level = 'Excellent';
    feedback.push('Very strong password!');
  }

  return { score, level, feedback };
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @param {Object} options - Generation options
 * @returns {string} - Generated password
 */
const generateSecurePassword = (length = 12, options = {}) => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecialChars = true,
    excludeSimilar = true // Exclude similar looking characters like 0, O, l, 1
  } = options;

  let charset = '';
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSpecialChars) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (!charset) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  const charsetLength = charset.length;
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charsetLength);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * Generate a temporary password for password reset
 * @returns {string} - Temporary password
 */
const generateTempPassword = () => {
  return generateSecurePassword(10, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSpecialChars: false,
    excludeSimilar: true
  });
};

/**
 * Check if password needs to be updated (based on age or security requirements)
 * @param {Date} lastPasswordChange - Date of last password change
 * @param {number} maxAgeInDays - Maximum password age in days (default: 90)
 * @returns {boolean} - True if password should be updated
 */
const shouldUpdatePassword = (lastPasswordChange, maxAgeInDays = 90) => {
  if (!lastPasswordChange) {
    return true; // No password change date recorded
  }

  const daysSinceChange = (Date.now() - new Date(lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceChange > maxAgeInDays;
};

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  calculatePasswordStrength,
  generateSecurePassword,
  generateTempPassword,
  shouldUpdatePassword,
  PASSWORD_REQUIREMENTS
};