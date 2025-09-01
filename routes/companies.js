const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize, requirePermission } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Public endpoint for active companies (needed for signup)
router.get('/active', asyncHandler(async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        state: true
      },
      orderBy: { name: 'asc' }
    });

    logger.info('Active companies retrieved successfully (public)', {
      count: companies.length
    });

    res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error) {
    logger.error('Error retrieving active companies (public)', {
      error: error.message
    });
    throw new AppError('Failed to retrieve active companies', 500);
  }
}));

// Apply authentication to all other routes
router.use(authenticate);

// Permission-based authorization will be applied to individual routes

// Validation rules for creating company
const createCompanyValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
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
  
  body('gst_number')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please provide a valid GST number'),
  
  body('pan_number')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Please provide a valid PAN number'),
  
  body('subscription_plan')
    .optional()
    .isIn(['BASIC', 'PREMIUM', 'ENTERPRISE'])
    .withMessage('Invalid subscription plan'),
  
  body('subscription_expires_at')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid expiry date')
];

// Validation rules for updating company
const updateCompanyValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  
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
  
  body('gst_number')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please provide a valid GST number'),
  
  body('pan_number')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Please provide a valid PAN number'),
  
  body('subscription_plan')
    .optional()
    .isIn(['BASIC', 'PREMIUM', 'ENTERPRISE'])
    .withMessage('Invalid subscription plan'),
  
  body('subscription_expires_at')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid expiry date')
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

// GET /api/companies - Get all companies with pagination and filtering
router.get('/', requirePermission('companies', 'view'), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = 'all',
    subscription_plan = 'all',
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchQuery = search.trim();

  // Build where clause
  const whereClause = {
    AND: [
      // Search filter
      searchQuery ? {
        OR: [
          { name: { contains: searchQuery } },
          { email: { contains: searchQuery } },
          { city: { contains: searchQuery } },
          { state: { contains: searchQuery } }
        ]
      } : {},
      // Status filter
      status !== 'all' ? { is_active: status === 'active' } : {},
      // Subscription plan filter
      subscription_plan !== 'all' ? { subscription_plan } : {}
    ].filter(condition => Object.keys(condition).length > 0)
  };

  // Build order by clause
  const orderBy = {};
  orderBy[sort_by] = sort_order;

  try {
    // Get companies with stats
    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        include: {
          branches: {
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
      prisma.company.count({ where: whereClause })
    ]);

    // Calculate stats for each company
    const companiesWithStats = companies.map(company => ({
      ...company,
      total_branches: company.branches.length,
      active_branches: company.branches.filter(b => b.is_active).length,
      total_staff: company.staff.length,
      active_staff: company.staff.filter(s => s.is_active).length,
      branches: undefined, // Remove detailed branches from response
      staff: undefined // Remove detailed staff from response
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    logger.info('Companies retrieved successfully', {
      userId: req.user.id,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: {
        companies: companiesWithStats,
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
    logger.error('Error retrieving companies', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to retrieve companies', 500);
  }
}));



// GET /api/companies/:id - Get company by ID
router.get('/:id', requirePermission('companies', 'view'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        branches: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            is_active: true,
            created_at: true
          },
          orderBy: { name: 'asc' }
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

    if (!company) {
      return next(new AppError('Company not found', 404));
    }

    logger.info('Company retrieved successfully', {
      userId: req.user.id,
      companyId: id
    });

    res.status(200).json({
      success: true,
      data: { company }
    });
  } catch (error) {
    logger.error('Error retrieving company', {
      error: error.message,
      userId: req.user.id,
      companyId: id
    });
    throw new AppError('Failed to retrieve company', 500);
  }
}));

// POST /api/companies - Create new company
router.post('/', requirePermission('companies', 'create'), createCompanyValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const companyData = req.body;

  try {
    // Check if email already exists
    const existingCompany = await prisma.company.findUnique({
      where: { email: companyData.email }
    });

    if (existingCompany) {
      return next(new AppError('Company with this email already exists', 409));
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        ...companyData,
        subscription_expires_at: companyData.subscription_expires_at ? new Date(companyData.subscription_expires_at) : null
      }
    });

    logger.info('Company created successfully', {
      userId: req.user.id,
      companyId: company.id,
      companyName: company.name
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: { company }
    });
  } catch (error) {
    logger.error('Error creating company', {
      error: error.message,
      userId: req.user.id,
      companyData: { ...companyData, password: undefined }
    });
    throw new AppError('Failed to create company', 500);
  }
}));

// PUT /api/companies/:id - Update company
router.put('/:id', requirePermission('companies', 'edit'), updateCompanyValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestData = req.body;

  try {
    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return next(new AppError('Company not found', 404));
    }

    // Check if email is being updated and already exists
    if (requestData.email && requestData.email !== existingCompany.email) {
      const emailExists = await prisma.company.findUnique({
        where: { email: requestData.email }
      });

      if (emailExists) {
        return next(new AppError('Company with this email already exists', 409));
      }
    }

    // Prepare update data by filtering out fields that shouldn't be updated
    const { id: companyId, created_at, updated_at, total_branches, active_branches, total_staff, active_staff, branches, staff, ...updateData } = requestData;

    // Update company
    const company = await prisma.company.update({
      where: { id },
      data: {
        ...updateData,
        subscription_expires_at: updateData.subscription_expires_at ? new Date(updateData.subscription_expires_at) : undefined
      }
    });

    logger.info('Company updated successfully', {
      userId: req.user.id,
      companyId: id,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: { company }
    });
  } catch (error) {
    logger.error('Error updating company', {
      error: error.message,
      userId: req.user.id,
      companyId: id,
      requestData
    });
    throw new AppError('Failed to update company', 500);
  }
}));

// PATCH /api/companies/:id/activate - Activate company
router.patch('/:id/activate', requirePermission('companies', 'edit'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const company = await prisma.company.update({
      where: { id },
      data: { is_active: true }
    });

    logger.info('Company activated successfully', {
      companyId: id,
      companyName: company.name,
      activatedBy: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Company activated successfully',
      data: { company }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Company not found', 404));
    }
    logger.error('Error activating company', {
      error: error.message,
      userId: req.user.id,
      companyId: id
    });
    throw new AppError('Failed to activate company', 500);
  }
}));

// PATCH /api/companies/:id/deactivate - Deactivate company
router.patch('/:id/deactivate', requirePermission('companies', 'edit'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Deactivate company and all its branches and staff
    const [company] = await prisma.$transaction([
      prisma.company.update({
        where: { id },
        data: { is_active: false }
      }),
      prisma.branch.updateMany({
        where: { company_id: id },
        data: { is_active: false }
      }),
      prisma.staff.updateMany({
        where: { company_id: id },
        data: { is_active: false }
      })
    ]);

    logger.info('Company deactivated successfully', {
      companyId: id,
      companyName: company.name,
      deactivatedBy: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Company and all associated branches/staff deactivated successfully',
      data: { company }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Company not found', 404));
    }
    logger.error('Error deactivating company', {
      error: error.message,
      userId: req.user.id,
      companyId: id
    });
    throw new AppError('Failed to deactivate company', 500);
  }
}));

// DELETE /api/companies/:id - Delete company (soft delete by deactivating)
router.delete('/:id', requirePermission('companies', 'delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if company has any active branches or staff
    const companyWithDetails = await prisma.company.findUnique({
      where: { id },
      include: {
        branches: { where: { is_active: true } },
        staff: { where: { is_active: true } }
      }
    });

    if (!companyWithDetails) {
      return next(new AppError('Company not found', 404));
    }

    if (companyWithDetails.branches.length > 0 || companyWithDetails.staff.length > 0) {
      return next(new AppError('Cannot delete company with active branches or staff. Please deactivate them first.', 400));
    }

    // Soft delete by deactivating
    const company = await prisma.company.update({
      where: { id },
      data: { is_active: false }
    });

    logger.info('Company deleted (deactivated) successfully', {
      companyId: id,
      companyName: company.name,
      deletedBy: req.user.email
    });

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting company', {
      error: error.message,
      userId: req.user.id,
      companyId: id
    });
    throw new AppError('Failed to delete company', 500);
  }
}));

// GET /api/companies/stats/overview - Get companies overview stats
router.get('/stats/overview', asyncHandler(async (req, res) => {
  try {
    const [totalCompanies, activeCompanies, totalBranches, activeBranches, totalStaff, activeStaff] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { is_active: true } }),
      prisma.branch.count(),
      prisma.branch.count({ where: { is_active: true } }),
      prisma.staff.count({ where: { role: { not: 'SUPERADMIN' } } }),
      prisma.staff.count({ where: { is_active: true, role: { not: 'SUPERADMIN' } } })
    ]);

    const stats = {
      companies: {
        total: totalCompanies,
        active: activeCompanies,
        inactive: totalCompanies - activeCompanies
      },
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

    logger.info('Company stats retrieved successfully', {
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error retrieving company stats', {
      error: error.message,
      userId: req.user.id
    });
    throw new AppError('Failed to retrieve company stats', 500);
  }
}));

module.exports = router;