const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { 
  generateToken, 
  setTokenCookie, 
  clearTokenCookie, 
  authenticate,
  sensitiveOpLimiter 
} = require('../middleware/auth');
const { 
  hashPassword, 
  verifyPassword, 
  validatePasswordStrength,
  generateTempPassword 
} = require('../utils/password');
const { 
  generateOTP, 
  storeOTP, 
  verifyOTP, 
  sendOTPEmail
} = require('../utils/otp');
const { 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} = require('../utils/email');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation rules
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('mobile')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('role')
    .isIn(['ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN', 'SUPERADMIN'])
    .withMessage('Invalid role specified'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  
  body('branch_id')
    .optional()
    .isLength({ min: 20, max: 30 })
    .matches(/^[a-z0-9]+$/)
    .withMessage('Invalid branch ID format'),

  body('company_id')
    .optional()
    .isLength({ min: 20, max: 30 })
    .matches(/^[a-z0-9]+$/)
    .withMessage('Invalid company ID format')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const otpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

// Superadmin signup validation (no company/branch required)
const superadminSignupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('mobile')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  
  body('setup_key')
    .notEmpty()
    .withMessage('Setup key is required for superadmin creation')
];

// Enhanced signup validation with company/branch requirements
const enhancedSignupValidation = [
  ...signupValidation,
  body('company_id')
    .if(body('role').not().equals('SUPERADMIN'))
    .notEmpty()
    .withMessage('Company ID is required for non-superadmin roles'),
  
  body('branch_id')
    .if(body('role').not().equals('SUPERADMIN'))
    .notEmpty()
    .withMessage('Branch ID is required for non-superadmin roles')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

// @route   POST /api/auth/superadmin-setup
// @desc    Setup superadmin account (offline setup)
// @access  Public (with setup key)
router.post('/superadmin-setup', superadminSignupValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, email, mobile, password, setup_key } = req.body;

  // Verify setup key (in production, this should be a secure environment variable)
  const SUPERADMIN_SETUP_KEY = process.env.SUPERADMIN_SETUP_KEY || 'SETUP_SUPERADMIN_2024';
  
  if (setup_key !== SUPERADMIN_SETUP_KEY) {
    logger.logAuth('superadmin_setup_attempt', email, false, 'Invalid setup key');
    return res.status(401).json({
      success: false,
      message: 'Invalid setup key provided'
    });
  }

  // Check if superadmin already exists
  const existingSuperadmin = await prisma.staff.findFirst({
    where: { role: 'SUPERADMIN' }
  });

  if (existingSuperadmin) {
    logger.logAuth('superadmin_setup_attempt', email, false, 'Superadmin already exists');
    return res.status(409).json({
      success: false,
      message: 'Superadmin account already exists. Only one superadmin is allowed.'
    });
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  // Check if email already exists
  const existingUser = await prisma.staff.findUnique({
    where: { email }
  });

  if (existingUser) {
    logger.logAuth('superadmin_setup_attempt', email, false, 'Email already registered');
    return res.status(409).json({
      success: false,
      message: 'This email is already registered.'
    });
  }

  // Check if mobile already exists
  const existingMobile = await prisma.staff.findUnique({
    where: { mobile }
  });

  if (existingMobile) {
    return res.status(409).json({
      success: false,
      message: 'This mobile number is already registered.'
    });
  }

  try {
    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create superadmin user (no company/branch required)
    const superadmin = await prisma.staff.create({
      data: {
        name,
        email,
        mobile,
        role: 'SUPERADMIN',
        password_hash: hashedPassword,
        is_active: true,
        email_verified: true // Superadmin doesn't need email verification
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        is_active: true,
        created_at: true
      }
    });

    // Generate JWT token
    const token = generateToken({
      id: superadmin.id,
      email: superadmin.email,
      role: superadmin.role
    });

    // Set HTTP-only cookie
    setTokenCookie(res, token);

    logger.logAuth('superadmin_setup_successful', email, true);

    res.status(201).json({
      success: true,
      message: 'Superadmin account created successfully',
      user: superadmin,
      token
    });
  } catch (error) {
    logger.error('Error creating superadmin', {
      error: error.message,
      email
    });
    throw new AppError('Failed to create superadmin account', 500);
  }
}));

// @route   POST /api/auth/signup
// @desc    Register new staff member with OTP verification (requires company/branch for non-superadmin)
// @access  Public
router.post('/signup', enhancedSignupValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, email, mobile, role, password, branch_id, company_id } = req.body;

  // Prevent superadmin signup through regular signup endpoint
  if (role === 'SUPERADMIN') {
    return res.status(400).json({
      success: false,
      message: 'Superadmin accounts must be created through the setup endpoint'
    });
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  // Check if email already exists
  const existingUser = await prisma.staff.findUnique({
    where: { email }
  });

  if (existingUser) {
    logger.logAuth('signup_attempt', email, false, 'Email already registered');
    return res.status(409).json({
      success: false,
      message: 'This email is already registered. Please Sign In.'
    });
  }

  // Check if mobile already exists
  const existingMobile = await prisma.staff.findUnique({
    where: { mobile }
  });

  if (existingMobile) {
    return res.status(409).json({
      success: false,
      message: 'This mobile number is already registered.'
    });
  }

  // Validate company and branch for non-superadmin roles
  if (company_id && branch_id) {
    // Verify company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: company_id, is_active: true }
    });

    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company selected'
      });
    }

    // Verify branch exists, is active, and belongs to the company
    const branch = await prisma.branch.findUnique({
      where: { 
        id: branch_id, 
        is_active: true,
        company_id: company_id
      }
    });

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch selected or branch does not belong to the specified company'
      });
    }
  }

  // Generate and send OTP
  const otp = generateOTP();
  await storeOTP(email, otp);
  await sendOTPEmail(email, otp);

  // Store signup data temporarily (in production, use Redis or similar)
  // For now, we'll return a signup token that contains the data
  const signupData = {
    name,
    email,
    mobile,
    role,
    password,
    company_id,
    branch_id,
    timestamp: Date.now()
  };

  const signupToken = generateToken(signupData);

  logger.logAuth('signup_otp_sent', email, true);

  res.status(200).json({
    success: true,
    message: 'OTP sent to your email address. Please verify to complete registration.',
    signupToken,
    email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email address
  });
}));

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and complete registration
// @access  Public
router.post('/verify-otp', otpValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { email, otp, signupToken } = req.body;

  if (!signupToken) {
    return res.status(400).json({
      success: false,
      message: 'Invalid signup session. Please start registration again.'
    });
  }

  // Verify signup token and extract data
  let signupData;
  try {
    signupData = jwt.verify(signupToken, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired signup session. Please start registration again.'
    });
  }

  // Check if signup session is not too old (30 minutes)
  if (Date.now() - signupData.timestamp > 30 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      message: 'Signup session expired. Please start registration again.'
    });
  }

  // Verify OTP
  const otpResult = await verifyOTP(email, otp);
  
  if (!otpResult.success) {
    logger.logAuth('otp_verification', signupData.email, false, otpResult.message);
    return res.status(400).json({
      success: false,
      message: otpResult.message,
      code: otpResult.code,
      attemptsRemaining: otpResult.attemptsRemaining
    });
  }

  // Hash password
  const hashedPassword = await hashPassword(signupData.password);

  // Create new staff member
  const newStaff = await prisma.staff.create({
    data: {
      name: signupData.name,
      email: signupData.email,
      mobile: signupData.mobile,
      role: signupData.role,
      password_hash: hashedPassword,
      company_id: signupData.company_id || null,
      branch_id: signupData.branch_id || null
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      company_id: true,
      branch_id: true,
      created_at: true,
      company: {
        select: {
          id: true,
          name: true,
          is_active: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          city: true
        }
      }
    }
  });

  // Generate JWT token
  const token = generateToken({
    id: newStaff.id,
    email: newStaff.email,
    role: newStaff.role
  });

  // Set HTTP-only cookie
  setTokenCookie(res, token);

  // Send welcome email
  try {
    await sendWelcomeEmail(newStaff.email, newStaff.name, newStaff.role, 'Please set your password');
  } catch (emailError) {
    logger.error('Failed to send welcome email:', emailError.message);
    // Don't fail the registration if email fails
  }

  logger.logAuth('signup_completed', newStaff.email, true);

  res.status(201).json({
    success: true,
    message: 'Registration completed successfully',
    user: newStaff,
    token
  });
}));

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', loginValidation, handleValidationErrors, sensitiveOpLimiter(10, 5 * 60 * 1000), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await prisma.staff.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      password_hash: true,
      is_active: true,
      company_id: true,
      branch_id: true,
      last_login: true,
      company: {
        select: {
          id: true,
          name: true,
          is_active: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          city: true
        }
      }
    }
  });

  if (!user) {
    logger.logAuth('login_attempt', email, false, 'User not found');
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  if (!user.is_active) {
    logger.logAuth('login_attempt', email, false, 'Account deactivated');
    return res.status(401).json({
      success: false,
      message: 'Your account has been deactivated. Please contact administrator.'
    });
  }

  // Check if company is active (except for superadmin)
  if (user.role !== 'SUPERADMIN' && user.company && !user.company.is_active) {
    logger.logAuth('login_attempt', email, false, 'Company deactivated');
    return res.status(401).json({
      success: false,
      message: 'Your company account has been deactivated. Please contact administrator.'
    });
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash);
  
  if (!isPasswordValid) {
    logger.logAuth('login_attempt', email, false, 'Invalid password');
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Update last login
  await prisma.staff.update({
    where: { id: user.id },
    data: { last_login: new Date() }
  });

  // Generate JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id
  });

  // Set HTTP-only cookie
  setTokenCookie(res, token);

  // Remove password hash from response
  const { password_hash, ...userResponse } = user;

  logger.logAuth('login_successful', email, true);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: userResponse,
    token
  });
}));

// @route   POST /api/auth/forgot-password
// @desc    Reset password and send new password via email
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, sensitiveOpLimiter(3), asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user by email
  const user = await prisma.staff.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true
    }
  });

  if (!user) {
    logger.logAuth('forgot_password_attempt', email, false, 'Email not registered');
    return res.status(404).json({
      success: false,
      message: 'Email not registered'
    });
  }

  if (!user.is_active) {
    logger.logAuth('forgot_password_attempt', email, false, 'Account deactivated');
    return res.status(401).json({
      success: false,
      message: 'Your account has been deactivated. Please contact administrator.'
    });
  }

  // Generate temporary password
  const tempPassword = generateTempPassword();
  const hashedTempPassword = await hashPassword(tempPassword);

  // Update user password
  await prisma.staff.update({
    where: { id: user.id },
    data: { password_hash: hashedTempPassword }
  });

  // Send password reset email
  try {
    await sendPasswordResetEmail(user.email, user.name, tempPassword);
    
    logger.logAuth('password_reset_successful', email, true);
    
    res.status(200).json({
      success: true,
      message: 'New password has been sent to your email address'
    });
  } catch (emailError) {
    logger.error('Failed to send password reset email:', emailError.message);
    
    // Revert password change if email fails
    // In production, you might want to handle this differently
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email. Please try again later.'
    });
  }
}));

// @route   POST /api/auth/logout
// @desc    Logout user and clear token
// @access  Private
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Clear HTTP-only cookie
  clearTokenCookie(res);

  logger.logAuth('logout', req.user.email, true);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.staff.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      is_active: true,
      company_id: true,
      branch_id: true,
      created_at: true,
      last_login: true,
      company: {
        select: {
          id: true,
          name: true,
          is_active: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    user
  });
}));

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for signup verification
// @access  Public
router.post('/resend-otp', asyncHandler(async (req, res) => {
  const { email, signupToken } = req.body;

  if (!signupToken) {
    return res.status(400).json({
      success: false,
      message: 'Invalid signup session'
    });
  }

  // Generate and send new OTP
  const otp = generateOTP();
  
  try {
    await storeOTP(email, otp);
    await sendOTPEmail(email, otp);
    
    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email address'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

module.exports = router;