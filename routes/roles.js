const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation failed', {
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      errors: errors.array()
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   GET /api/roles/permissions
// @desc    Get all available permissions
// @access  Superadmin only
router.get('/permissions', authorize(['SUPERADMIN']), asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [
      { module: 'asc' },
      { action: 'asc' }
    ]
  });

  res.status(200).json({
    success: true,
    data: permissions,
    count: permissions.length
  });
}));

// @route   POST /api/roles/permissions
// @desc    Create a new permission
// @access  Superadmin only
router.post('/permissions', 
  authorize(['SUPERADMIN']),
  [
    body('module')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Module must be between 2 and 50 characters'),
    body('action')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Action must be between 2 and 50 characters'),
    body('resource')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Resource must not exceed 100 characters'),
    body('data_scope')
      .isIn(['GLOBAL', 'COMPANY', 'BRANCH', 'PERSONAL'])
      .withMessage('Invalid data scope')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { module, action, resource, data_scope, description } = req.body;

    // Check if permission already exists
    const existingPermission = await prisma.permission.findFirst({
      where: {
        module,
        action,
        resource: resource || null
      }
    });

    if (existingPermission) {
      return res.status(409).json({
        success: false,
        message: 'Permission already exists'
      });
    }

    const permission = await prisma.permission.create({
      data: {
        module,
        action,
        resource,
        data_scope,
        description
      }
    });

    logger.info('Permission created', {
      permissionId: permission.id,
      module,
      action,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission
    });
  })
);

// @route   GET /api/roles/role-permissions/:role
// @desc    Get permissions for a specific role
// @access  Superadmin only
router.get('/role-permissions/:role', authorize(['SUPERADMIN']), asyncHandler(async (req, res) => {
  const { role } = req.params;

  // Validate role
  const validRoles = ['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role specified'
    });
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role },
    include: {
      permission: true
    },
    orderBy: {
      permission: {
        module: 'asc'
      }
    }
  });

  res.status(200).json({
    success: true,
    data: rolePermissions,
    count: rolePermissions.length
  });
}));

// @route   POST /api/roles/role-permissions
// @desc    Assign permissions to a role
// @access  Superadmin only
router.post('/role-permissions',
  (req, res, next) => {
    logger.info('POST /api/roles/role-permissions request received', {
      body: req.body,
      headers: req.headers,
      user: req.user
    });
    next();
  },
  authorize(['SUPERADMIN']),
  [
    body('role')
      .isIn(['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'])
      .withMessage('Invalid role'),
    body('permission_ids')
      .isArray({ min: 1 })
      .withMessage('At least one permission must be selected'),
    body('permission_ids.*')
      .isLength({ min: 25, max: 25 })
      .matches(/^c[a-zA-Z0-9]{24}$/)
      .withMessage('Invalid permission ID format')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { role, permission_ids } = req.body;

    // Verify all permission IDs exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permission_ids }
      }
    });

    if (permissions.length !== permission_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more permission IDs are invalid'
      });
    }

    // Remove existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { role }
    });

    // Create new role permissions
    const rolePermissions = await prisma.rolePermission.createMany({
      data: permission_ids.map(permission_id => ({
        role,
        permission_id
      }))
    });

    logger.info('Role permissions updated', {
      role,
      permissionCount: permission_ids.length,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: { role, assigned_permissions: permission_ids.length }
    });
  })
);

// @route   DELETE /api/roles/role-permissions/:role/:permissionId
// @desc    Remove a specific permission from a role
// @access  Superadmin only
router.delete('/role-permissions/:role/:permissionId', 
  authorize(['SUPERADMIN']), 
  asyncHandler(async (req, res) => {
    const { role, permissionId } = req.params;

    // Validate role
    const validRoles = ['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'TECHNICIAN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role,
        permission_id: permissionId
      }
    });

    if (!rolePermission) {
      return res.status(404).json({
        success: false,
        message: 'Role permission not found'
      });
    }

    await prisma.rolePermission.delete({
      where: { id: rolePermission.id }
    });

    logger.info('Role permission removed', {
      role,
      permissionId,
      removedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Permission removed from role successfully'
    });
  })
);

// @route   GET /api/roles/user-permissions
// @desc    Get current user's permissions
// @access  Authenticated users
router.get('/user-permissions', asyncHandler(async (req, res) => {
  const userPermissions = await prisma.rolePermission.findMany({
    where: { role: req.user.role },
    include: {
      permission: true
    }
  });

  const permissions = userPermissions.map(rp => rp.permission);

  res.status(200).json({
    success: true,
    data: permissions,
    count: permissions.length
  });
}));

// @route   GET /api/roles/check-permission
// @desc    Check if current user has specific permission
// @access  Authenticated users
router.get('/check-permission', asyncHandler(async (req, res) => {
  const { module, action, resource } = req.query;

  if (!module || !action) {
    return res.status(400).json({
      success: false,
      message: 'Module and action are required'
    });
  }

  const hasPermission = await prisma.rolePermission.findFirst({
    where: {
      role: req.user.role,
      permission: {
        module,
        action,
        resource: resource || null
      }
    }
  });

  res.status(200).json({
    success: true,
    data: {
      has_permission: !!hasPermission,
      module,
      action,
      resource: resource || null
    }
  });
}));

module.exports = router;