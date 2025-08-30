const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize, authorizeCompany, authorizeBranch } = require('../middleware/auth');
const { hashPassword, validatePasswordStrength } = require('../utils/password');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const createStaffValidation = [
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
    .isIn(['ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'])
    .withMessage('Invalid role specified'),
  
  body('company_id')
    .notEmpty()
    .isLength({ min: 25, max: 25 })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Valid company ID is required'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  
  body('branch_id')
    .optional()
    .isLength({ min: 25, max: 25 })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid branch ID format')
];

const updateStaffValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('mobile')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('role')
    .optional()
    .isIn(['ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'])
    .withMessage('Invalid role specified'),
  
  body('company_id')
    .optional()
    .isLength({ min: 25, max: 25 })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid company ID format'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
  
  body('branch_id')
    .optional()
    .isLength({ min: 25, max: 25 })
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid branch ID format')
];

const changePasswordValidation = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('new_password')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
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

// @route   GET /api/staff
// @desc    Get all staff members with filtering and pagination
// @access  Private (SuperAdmin, Admin, Regional Manager, Area Manager)
router.get('/', authorize(['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER']), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    is_active,
    branch_id,
    search
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build where clause
  const where = {};

  if (role) where.role = role;
  if (is_active !== undefined) where.is_active = is_active === 'true';
  if (branch_id) where.branch_id = branch_id;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } }
    ];
  }

  // Role-based filtering
  if (req.user.role === 'AREA_MANAGER' && req.user.branch_id) {
    where.branch_id = req.user.branch_id;
  }

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        is_active: true,
        branch_id: true,
        created_at: true,
        last_login: true,
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    }),
    prisma.staff.count({ where })
  ]);

  const totalPages = Math.ceil(total / take);

  res.status(200).json({
    success: true,
    data: staff,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalRecords: total,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    }
  });
}));

// Get staff list with role-based filtering
router.get('/list', authorize(['SUPERADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role = '', branch_id = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Build base filter based on user role
  let baseFilter = {
    is_active: true
  };

  // Role-based access control
  if (req.user.role === 'ADMIN') {
    // Admin can only see staff from their company
    baseFilter.company_id = req.user.company_id;
  } else if (req.user.role === 'SUPERADMIN') {
    // Superadmin can see all staff
    // No additional filter needed
  }

  // Apply search filter
  if (search) {
    baseFilter.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Apply role filter
  if (role) {
    baseFilter.role = role;
  }

  // Apply branch filter
  if (branch_id) {
    baseFilter.branch_id = branch_id;
  }

  const [staff, totalCount] = await Promise.all([
    prisma.staff.findMany({
      where: baseFilter,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        is_active: true,
        created_at: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            branch_type: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: offset,
      take: parseInt(limit)
    }),
    prisma.staff.count({ where: baseFilter })
  ]);

  res.status(200).json({
    success: true,
    data: {
      staff,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   GET /api/staff/:id
// @desc    Get single staff member by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Users can view their own profile, or admins/managers can view others
  if (req.user.id !== id && !['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const staff = await prisma.staff.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      is_active: true,
      branch_id: true,
      created_at: true,
      updated_at: true,
      last_login: true,
      branch: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          address: true,
          phone: true
        }
      },
      assigned_leads: {
        select: {
          id: true,
          customer_name: true,
          service_type: true,
          status: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' },
        take: 5
      }
    }
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found'
    });
  }

  // Area managers can only view staff from their branch
  if (req.user.role === 'AREA_MANAGER' && req.user.branch_id !== staff.branch_id && req.user.id !== id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.status(200).json({
    success: true,
    data: staff
  });
}));

// @route   POST /api/staff
// @desc    Create new staff member
// @access  Private (SuperAdmin, Admin, Regional Manager only)
router.post('/', authorize(['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER']), createStaffValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const {
    name,
    email,
    mobile,
    role,
    password,
    company_id,
    branch_id
  } = req.body;

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
  const existingEmail = await prisma.staff.findUnique({
    where: { email }
  });

  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Check if mobile already exists
  const existingMobile = await prisma.staff.findUnique({
    where: { mobile }
  });

  if (existingMobile) {
    return res.status(409).json({
      success: false,
      message: 'Mobile number already registered'
    });
  }

  // Validate company_id
  const company = await prisma.company.findUnique({
    where: { id: company_id, is_active: true }
  });

  if (!company) {
    return res.status(400).json({
      success: false,
      message: 'Invalid company selected'
    });
  }

  // Validate branch_id if provided and ensure it belongs to the company
  if (branch_id) {
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

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create new staff member
  const newStaff = await prisma.staff.create({
    data: {
      name,
      email,
      mobile,
      role,
      password_hash: hashedPassword,
      company_id,
      branch_id: branch_id || null
    },
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

  logger.info(`New staff member created: ${newStaff.email} by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Staff member created successfully',
    data: newStaff
  });
}));

// @route   PUT /api/staff/:id
// @desc    Update staff member
// @access  Private
router.put('/:id', updateStaffValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if staff exists
  const existingStaff = await prisma.staff.findUnique({
    where: { id }
  });

  if (!existingStaff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found'
    });
  }

  // Permission checks
  const canUpdate = 
    req.user.id === id || // Users can update their own profile (limited fields)
    ['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER'].includes(req.user.role) || // SuperAdmins, Admins and Regional Managers can update anyone
    (req.user.role === 'AREA_MANAGER' && existingStaff.branch_id === req.user.branch_id); // Area Managers can update staff in their branch

  if (!canUpdate) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // If user is updating their own profile, limit fields they can change
  if (req.user.id === id && !['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER'].includes(req.user.role)) {
    const allowedFields = ['name', 'mobile'];
    const restrictedFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
    
    if (restrictedFields.length > 0) {
      return res.status(403).json({
        success: false,
        message: `You can only update: ${allowedFields.join(', ')}`
      });
    }
  }

  // Check email uniqueness if email is being updated
  if (updateData.email && updateData.email !== existingStaff.email) {
    const emailExists = await prisma.staff.findUnique({
      where: { email: updateData.email }
    });

    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }
  }

  // Check mobile uniqueness if mobile is being updated
  if (updateData.mobile && updateData.mobile !== existingStaff.mobile) {
    const mobileExists = await prisma.staff.findUnique({
      where: { mobile: updateData.mobile }
    });

    if (mobileExists) {
      return res.status(409).json({
        success: false,
        message: 'Mobile number already registered'
      });
    }
  }

  // Validate branch_id if being updated
  if (updateData.branch_id) {
    const branch = await prisma.branch.findUnique({
      where: { id: updateData.branch_id, is_active: true }
    });

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch selected'
      });
    }
  }

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const updatedStaff = await prisma.staff.update({
    where: { id },
    data: {
      ...updateData,
      updated_at: new Date()
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      is_active: true,
      branch_id: true,
      created_at: true,
      updated_at: true,
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

  logger.info(`Staff member updated: ${id} by user: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Staff member updated successfully',
    data: updatedStaff
  });
}));

// @route   DELETE /api/staff/:id
// @desc    Delete staff member (soft delete by setting is_active to false)
// @access  Private (SuperAdmin, Admin, Regional Manager only)
router.delete('/:id', authorize(['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const staff = await prisma.staff.findUnique({
    where: { id }
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found'
    });
  }

  // Soft delete by setting is_active to false
  await prisma.staff.update({
    where: { id },
    data: { 
      is_active: false,
      updated_at: new Date()
    }
  });

  logger.info(`Staff member deactivated: ${id} by user: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Staff member deactivated successfully'
  });
}));

// @route   POST /api/staff/:id/activate
// @desc    Activate staff member
// @access  Private (SuperAdmin, Admin, Regional Manager only)
router.post('/:id/activate', authorize(['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const staff = await prisma.staff.findUnique({
    where: { id }
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found'
    });
  }

  const updatedStaff = await prisma.staff.update({
    where: { id },
    data: { 
      is_active: true,
      updated_at: new Date()
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true
    }
  });

  logger.info(`Staff member activated: ${id} by user: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Staff member activated successfully',
    data: updatedStaff
  });
}));

// @route   POST /api/staff/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', changePasswordValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  console.log('=== POST PASSWORD CHANGE HANDLER REACHED ===');
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  // Get current user with password
  const user = await prisma.staff.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      password_hash: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify current password
  const { verifyPassword } = require('../utils/password');
  const isCurrentPasswordValid = await verifyPassword(current_password, user.password_hash);
  
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(new_password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'New password does not meet security requirements',
      errors: passwordValidation.errors
    });
  }

  // Check if new password is different from current
  const isSamePassword = await verifyPassword(new_password, user.password_hash);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: 'New password must be different from current password'
    });
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(new_password);

  // Update password
  await prisma.staff.update({
    where: { id: userId },
    data: { 
      password_hash: hashedNewPassword,
      updated_at: new Date()
    }
  });

  logger.logAuth('password_changed', user.email, true);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   GET /api/staff/stats/dashboard
// @desc    Get staff dashboard statistics
// @access  Private (SuperAdmin, Admin, Regional Manager, Area Manager)
router.get('/stats/dashboard', authorize(['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER']), asyncHandler(async (req, res) => {
  // Build base filter based on user role
  const baseFilter = {};
  if (req.user.role === 'AREA_MANAGER' && req.user.branch_id) {
    baseFilter.branch_id = req.user.branch_id;
  }

  const [totalStaff, activeStaff, roleStats, branchStats] = await Promise.all([
    prisma.staff.count({ where: baseFilter }),
    prisma.staff.count({ where: { ...baseFilter, is_active: true } }),
    prisma.staff.groupBy({
      by: ['role'],
      where: { ...baseFilter, is_active: true },
      _count: { role: true }
    }),
    req.user.role === 'SUPERADMIN' || req.user.role === 'ADMIN' || req.user.role === 'REGIONAL_MANAGER' ?
      prisma.staff.groupBy({
        by: ['branch_id'],
        where: { ...baseFilter, is_active: true },
        _count: { branch_id: true },
        _avg: { branch_id: true }
      }) : null
  ]);

  const stats = {
    totalStaff,
    activeStaff,
    inactiveStaff: totalStaff - activeStaff,
    roleBreakdown: roleStats.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {})
  };

  if (branchStats) {
    stats.branchBreakdown = branchStats.reduce((acc, item) => {
      acc[item.branch_id || 'unassigned'] = item._count.branch_id;
      return acc;
    }, {});
  }

  res.status(200).json({
    success: true,
    data: stats
  });
}));

// Staff password change validation
const staffPasswordChangeValidation = [
  body('staff_id')
    .notEmpty()
    .withMessage('Staff ID is required'),
  
  body('new_password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .custom((value) => {
      const validation = validatePasswordStrength(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    })
];

// Test endpoint
router.get('/test-debug', (req, res) => {
  console.log('=== TEST DEBUG ENDPOINT REACHED ===');
  res.json({ message: 'Debug test successful' });
});

// Change staff password (admin function)
router.put('/admin/change-password', 
  authorize(['SUPERADMIN', 'ADMIN']), 
  staffPasswordChangeValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { staff_id, new_password } = req.body;

    // Check if staff exists and user has permission to change their password
    const targetStaff = await prisma.staff.findUnique({
      where: { id: staff_id },
      include: {
        company: true,
        branch: true
      }
    });

    if (!targetStaff) {
      throw new AppError('Staff member not found', 404);
    }

    // Role-based access control
    if (req.user.role === 'ADMIN') {
      // Admin can only change passwords for staff in their company
      if (targetStaff.company_id !== req.user.company_id) {
        throw new AppError('You can only manage staff from your company', 403);
      }
    }
    // Superadmin can change any staff password (no additional check needed)

    // Prevent changing superadmin password unless user is superadmin
    if (targetStaff.role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new AppError('You cannot change superadmin password', 403);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(new_password);

    // Update the password
    await prisma.staff.update({
      where: { id: staff_id },
      data: {
        password_hash: hashedPassword,
        updated_at: new Date()
      }
    });

    // Log the password change
    logger.info('Password changed', {
      action: 'password_change',
      changed_by: req.user.id,
      changed_by_email: req.user.email,
      target_staff_id: staff_id,
      target_staff_email: targetStaff.email,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// Get available branches for staff assignment (for dropdowns)
router.get('/branches', authorize(['SUPERADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  let baseFilter = {};

  // Role-based access control
  if (req.user.role === 'ADMIN') {
    // Admin can only see branches from their company
    baseFilter.company_id = req.user.company_id;
  }
  // Superadmin can see all branches (no filter needed)

  const branches = await prisma.branch.findMany({
    where: baseFilter,
    select: {
      id: true,
      name: true,
      branch_type: true,
      city: true,
      company: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  res.status(200).json({
    success: true,
    data: branches
  });
}));

module.exports = router;