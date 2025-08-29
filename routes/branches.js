const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize, authorizeCompany } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Public endpoint for branches by company (needed for signup)
router.get('/by-company/:companyId/public', asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  try {
    // Verify company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId, is_active: true },
      select: { id: true, name: true }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Active company not found'
      });
    }

    const branches = await prisma.branch.findMany({
      where: {
        company_id: companyId,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true
      },
      orderBy: { name: 'asc' }
    });

    logger.info('Branches by company retrieved successfully (public)', {
      companyId,
      count: branches.length
    });

    res.status(200).json({
      success: true,
      data: branches
    });
  } catch (error) {
    logger.error('Error retrieving branches by company (public)', {
      error: error.message,
      companyId
    });
    throw new AppError('Failed to retrieve branches by company', 500);
  }
}));

// Apply authentication to all other routes
router.use(authenticate);

// Apply role-based authorization to all other routes (SUPERADMIN and ADMIN)
router.use(authorize('SUPERADMIN', 'ADMIN'));

// Validation rules for creating branch
const createBranchValidation = [
  body('company_id')
    .notEmpty()
    .withMessage('Company ID is required'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Branch name must be between 2 and 255 characters'),
  
  body('address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('pincode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Pincode must be a 6-digit number'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('branch_type')
    .optional()
    .isIn(['MAIN_BRANCH', 'GENERAL_BRANCH'])
    .withMessage('Branch type must be either MAIN_BRANCH or GENERAL_BRANCH')
];

// Validation rules for updating branch
const updateBranchValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Branch name must be between 2 and 255 characters'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('pincode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Pincode must be a 6-digit number'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('branch_type')
    .optional()
    .isIn(['MAIN_BRANCH', 'GENERAL_BRANCH'])
    .withMessage('Branch type must be either MAIN_BRANCH or GENERAL_BRANCH')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(`Validation failed: ${errorMessages.join(', ')}`, 400));
  }
  next();
};

// GET /api/branches - Get all branches with pagination and filtering
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    company_id = '',
    status = 'all',
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchQuery = search.trim();

  // Build where clause
  const whereClause = {
    AND: [
      // Company filter
      company_id ? { company_id } : {},
      // Search filter
      searchQuery ? {
        OR: [
          { name: { contains: searchQuery } },
          { city: { contains: searchQuery } },
          { state: { contains: searchQuery } },
          { address: { contains: searchQuery } }
        ]
      } : {},
      // Status filter
      status !== 'all' ? { is_active: status === 'active' } : {}
    ].filter(condition => Object.keys(condition).length > 0)
  };

  // Build order by clause
  const orderBy = {};
  orderBy[sort_by] = sort_order;

  try {
    // Get branches with company and staff info
    const [branches, totalCount] = await Promise.all([
      prisma.branch.findMany({
        where: whereClause,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              is_active: true
            }
          },
          staff: {
            select: {
              id: true,
              name: true,
              role: true,
              is_active: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.branch.count({ where: whereClause })
    ]);

    // Calculate stats for each branch
    const branchesWithStats = branches.map(branch => ({
      ...branch,
      total_staff: branch.staff.length,
      active_staff: branch.staff.filter(s => s.is_active).length,
      staff: undefined // Remove detailed staff from response
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    logger.info('Branches retrieved successfully', {
      userId: req.user.id,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: {
        branches: branchesWithStats,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: totalCount,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error retrieving branches', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to retrieve branches', 500);
  }
}));

// GET /api/branches/active - Get only active branches (for dropdowns)
router.get('/active', asyncHandler(async (req, res) => {
  const { company_id } = req.query;

  try {
    const whereClause = {
      is_active: true,
      ...(company_id && { company_id })
    };

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter out branches of inactive companies
    const activeBranches = branches.filter(branch => branch.company.is_active);

    logger.info('Active branches retrieved successfully', {
      userId: req.user.id,
      count: activeBranches.length,
      companyId: company_id
    });

    res.status(200).json({
      success: true,
      data: { branches: activeBranches }
    });
  } catch (error) {
    logger.error('Error retrieving active branches', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to retrieve active branches', 500);
  }
}));

// GET /api/branches/my-company - Get branches for current user's company
router.get('/my-company', asyncHandler(async (req, res) => {
  try {
    const user = await prisma.staff.findUnique({
      where: { id: req.user.id },
      include: {
        branch: {
          select: {
            company_id: true
          }
        }
      }
    });

    if (!user || !user.branch) {
      throw new AppError('User company not found', 404);
    }

    const branches = await prisma.branch.findMany({
      where: {
        company_id: user.branch.company_id,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        branch_type: true
      },
      orderBy: { name: 'asc' }
    });

    logger.info('User company branches retrieved successfully', {
      userId: req.user.id,
      companyId: user.branch.company_id,
      count: branches.length
    });

    res.status(200).json({
      success: true,
      data: { branches }
    });
  } catch (error) {
    logger.error('Error retrieving user company branches', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to retrieve company branches', 500);
  }
}));

// GET /api/branches/by-company/:companyId - Get branches by company ID
router.get('/by-company/:companyId', authorizeCompany(), asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { active_only = 'false' } = req.query;

  try {
    // Verify company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, is_active: true }
    });

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    const whereClause = {
      company_id: companyId,
      ...(active_only === 'true' && { is_active: true })
    };

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            role: true,
            is_active: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate stats for each branch
    const branchesWithStats = branches.map(branch => ({
      ...branch,
      company_name: company.name,
      total_staff: branch.staff.length,
      active_staff: branch.staff.filter(s => s.is_active).length,
      staff: undefined
    }));

    logger.info('Branches by company retrieved successfully', {
      userId: req.user.id,
      companyId,
      count: branches.length
    });

    res.status(200).json({
      success: true,
      data: {
        company,
        branches: branchesWithStats
      }
    });
  } catch (error) {
    logger.error('Error retrieving branches by company', {
      error: error.message,
      userId: req.user.id,
      companyId
    });
    throw new AppError('Failed to retrieve branches by company', 500);
  }
}));

// GET /api/branches/:id - Get branch by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            is_active: true
          }
        },
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            is_active: true,
            created_at: true
          },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!branch) {
      return next(new AppError('Branch not found', 404));
    }

    logger.info('Branch retrieved successfully', {
      userId: req.user.id,
      branchId: id
    });

    res.status(200).json({
      success: true,
      data: { branch }
    });
  } catch (error) {
    logger.error('Error retrieving branch', {
      error: error.message,
      userId: req.user.id,
      branchId: id
    });
    throw new AppError('Failed to retrieve branch', 500);
  }
}));

// POST /api/branches - Create new branch
router.post('/', createBranchValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const branchData = req.body;

  try {
    // Verify company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: branchData.company_id },
      select: { id: true, name: true, is_active: true }
    });

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    if (!company.is_active) {
      return next(new AppError('Cannot create branch for inactive company', 400));
    }

    // Check if branch name already exists for this company
    const existingBranch = await prisma.branch.findFirst({
      where: {
        company_id: branchData.company_id,
        name: branchData.name
      }
    });

    if (existingBranch) {
      return next(new AppError('Branch with this name already exists for the company', 409));
    }

    // Check if trying to create a main branch when one already exists
    if (branchData.branch_type === 'MAIN_BRANCH') {
      const existingMainBranch = await prisma.branch.findFirst({
        where: {
          company_id: branchData.company_id,
          branch_type: 'MAIN_BRANCH'
        }
      });

      if (existingMainBranch) {
        return next(new AppError('A main branch already exists for this company. Only one main branch is allowed per company.', 409));
      }
    }

    // Create branch
    const branch = await prisma.branch.create({
      data: branchData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      }
    });

    logger.info('Branch created successfully', {
      userId: req.user.id,
      branchId: branch.id,
      branchName: branch.name,
      companyId: branch.company_id
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: { branch }
    });
  } catch (error) {
    logger.error('Error creating branch', {
      error: error.message,
      userId: req.user.id,
      branchData
    });
    throw new AppError('Failed to create branch', 500);
  }
}));

// PUT /api/branches/:id - Update branch
router.put('/:id', updateBranchValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestData = req.body;

  try {
    // Check if branch exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      }
    });

    if (!existingBranch) {
      return next(new AppError('Branch not found', 404));
    }

    // Check if name is being updated and already exists for this company
    if (requestData.name && requestData.name !== existingBranch.name) {
      const nameExists = await prisma.branch.findFirst({
        where: {
          company_id: existingBranch.company_id,
          name: requestData.name,
          id: { not: id }
        }
      });

      if (nameExists) {
        return next(new AppError('Branch with this name already exists for the company', 409));
      }
    }

    // Check if trying to update to main branch when one already exists
    if (requestData.branch_type === 'MAIN_BRANCH' && existingBranch.branch_type !== 'MAIN_BRANCH') {
      const existingMainBranch = await prisma.branch.findFirst({
        where: {
          company_id: existingBranch.company_id,
          branch_type: 'MAIN_BRANCH',
          id: { not: id }
        }
      });

      if (existingMainBranch) {
        return next(new AppError('A main branch already exists for this company. Only one main branch is allowed per company.', 409));
      }
    }

    // Prepare update data by filtering out fields that shouldn't be updated
    const { company_id, id: branchId, company, created_at, updated_at, total_staff, active_staff, ...updateData } = requestData;

    // Update branch
    const branch = await prisma.branch.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      }
    });

    logger.info('Branch updated successfully', {
      userId: req.user.id,
      branchId: id,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'Branch updated successfully',
      data: { branch }
    });
  } catch (error) {
    logger.error('Error updating branch', {
      error: error.message,
      userId: req.user.id,
      branchId: id,
      requestData
    });
    throw new AppError('Failed to update branch', 500);
  }
}));

// PATCH /api/branches/:id/activate - Activate branch
router.patch('/:id/activate', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if branch exists and company is active
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      }
    });

    if (!existingBranch) {
      return next(new AppError('Branch not found', 404));
    }

    if (!existingBranch.company.is_active) {
      return next(new AppError('Cannot activate branch of inactive company', 400));
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: { is_active: true },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      }
    });

    logger.info('Branch activated successfully', {
      userId: req.user.id,
      branchId: id,
      branchName: branch.name
    });

    res.status(200).json({
      success: true,
      message: 'Branch activated successfully',
      data: { branch }
    });
  } catch (error) {
    logger.error('Error activating branch', {
      error: error.message,
      userId: req.user.id,
      branchId: id
    });
    throw new AppError('Failed to activate branch', 500);
  }
}));

// PATCH /api/branches/:id/deactivate - Deactivate branch
router.patch('/:id/deactivate', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Deactivate branch and all its staff
    const [branch] = await prisma.$transaction([
      prisma.branch.update({
        where: { id },
        data: { is_active: false },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              is_active: true
            }
          }
        }
      }),
      prisma.staff.updateMany({
        where: { branch_id: id },
        data: { is_active: false }
      })
    ]);

    logger.info('Branch deactivated successfully', {
      userId: req.user.id,
      branchId: id,
      branchName: branch.name
    });

    res.status(200).json({
      success: true,
      message: 'Branch and all associated staff deactivated successfully',
      data: { branch }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Branch not found', 404));
    }
    logger.error('Error deactivating branch', {
      error: error.message,
      userId: req.user.id,
      branchId: id
    });
    throw new AppError('Failed to deactivate branch', 500);
  }
}));

// DELETE /api/branches/:id - Delete branch (soft delete by deactivating)
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if branch has any active staff
    const branchWithStaff = await prisma.branch.findUnique({
      where: { id },
      include: {
        staff: { where: { is_active: true } }
      }
    });

    if (!branchWithStaff) {
      return next(new AppError('Branch not found', 404));
    }

    if (branchWithStaff.staff.length > 0) {
      return next(new AppError('Cannot delete branch with active staff. Please deactivate them first.', 400));
    }

    // Soft delete by deactivating
    const branch = await prisma.branch.update({
      where: { id },
      data: { is_active: false },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            is_active: true
          }
        }
      }
    });

    logger.info('Branch deleted (deactivated) successfully', {
      userId: req.user.id,
      branchId: id,
      branchName: branch.name
    });

    res.status(200).json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting branch', {
      error: error.message,
      userId: req.user.id,
      branchId: id
    });
    throw new AppError('Failed to delete branch', 500);
  }
}));

// GET /api/branches/stats/overview - Get branches overview stats
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const { company_id } = req.query;

  try {
    const whereClause = company_id ? { company_id } : {};

    const [totalBranches, activeBranches, totalStaff, activeStaff] = await Promise.all([
      prisma.branch.count({ where: whereClause }),
      prisma.branch.count({ where: { ...whereClause, is_active: true } }),
      prisma.staff.count({ 
        where: { 
          ...whereClause,
          role: { not: 'SUPERADMIN' },
          ...(company_id && { company_id })
        } 
      }),
      prisma.staff.count({ 
        where: { 
          ...whereClause,
          is_active: true, 
          role: { not: 'SUPERADMIN' },
          ...(company_id && { company_id })
        } 
      })
    ]);

    const stats = {
      branches: {
        total: totalBranches,
        active: activeBranches,
        inactive: totalBranches - activeBranches
      },
      staff: {
        total: totalStaff,
        active: activeStaff,
        inactive: totalStaff - activeStaff
      }
    };

    logger.info('Branch stats retrieved successfully', {
      userId: req.user.id,
      companyId: company_id
    });

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error retrieving branch stats', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to retrieve branch stats', 500);
  }
}));

module.exports = router;